# End-to-End Hospital Management App Deployment using DevSecOps on AWS EKS

This is a multi-tier web application with:
- **Backend**: Node.js (Express) — REST API on port 4000
- **Frontend**: React (Vite) — Patient-facing UI
- **Dashboard**: React (Vite) — Admin panel

## Tech Stack Used

- GitHub (Code)
- Docker (Containerization)
- Jenkins (CI)
- OWASP (Dependency check)
- SonarQube (Code quality)
- Trivy (Filesystem scan)
- ArgoCD (CD)
- AWS EKS (Kubernetes)
- Helm (Monitoring via Grafana and Prometheus)

---

## Project Structure

```
├── BACKEND/        # Node.js Express API (port 4000)
├── frontend/       # React Vite app (patient UI)
└── dashboard/      # React Vite app (admin panel)
```

---

## Steps to Deploy

### Pre-requisites

- Root user access on your EC2 instance

```bash
sudo su
```

> **Note:** This project will be implemented on the North California region (us-west-1).

---

### 1. Create EC2 Master Machine on AWS

- Instance type: **t2.medium**
- Storage: **29 GB**
- Open the following ports in the security group:

| Port  | Purpose              |
|-------|----------------------|
| 22    | SSH                  |
| 8081  | Jenkins              |
| 9000  | SonarQube            |
| 465   | SMTPS (Email)        |
| 80/443| HTTP/HTTPS           |

---

### 2. Create EKS Cluster on AWS

**Requirements:**
- IAM user with access keys and secret access keys
- AWSCLI configured

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install unzip
unzip awscliv2.zip
sudo ./aws/install
aws configure
```

**Install kubectl:**

```bash
curl -o kubectl https://amazon-eks.s3.us-west-2.amazonaws.com/1.19.6/2021-01-05/bin/linux/amd64/kubectl
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin
kubectl version --short --client
```

**Install eksctl:**

```bash
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
eksctl version
```

**Create EKS Cluster:**

```bash
eksctl create cluster --name=hospital-app \
  --region=us-west-1 \
  --version=1.30 \
  --without-nodegroup
```

**Associate IAM OIDC Provider:**

```bash
eksctl utils associate-iam-oidc-provider \
  --region us-west-1 \
  --cluster hospital-app \
  --approve
```

**Create Nodegroup:**

```bash
eksctl create nodegroup --cluster=hospital-app \
  --region=us-west-1 \
  --name=hospital-app \
  --node-type=t2.medium \
  --nodes=2 \
  --nodes-min=2 \
  --nodes-max=2 \
  --node-volume-size=29 \
  --ssh-access \
  --ssh-public-key=eks-nodegroup-key
```

> **Note:** Make sure the SSH public key `eks-nodegroup-key` exists in your AWS account.

---

### 3. Install Jenkins

```bash
sudo apt update -y
sudo apt install fontconfig openjdk-17-jre -y
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc]" \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update -y
sudo apt-get install jenkins -y
```

Change Jenkins default port from 8080 to 8081 (since the backend runs on 4000, this avoids future conflicts):

```bash
sudo nano /usr/lib/systemd/system/jenkins.service
# Change: Environment="JENKINS_PORT=8080" → Environment="JENKINS_PORT=8081"
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart jenkins
```

---

### 4. Install Docker

```bash
sudo apt install docker.io -y
sudo usermod -aG docker ubuntu && newgrp docker
```

Give Docker socket permission so Jenkins pipelines can run docker commands:

```bash
chmod 777 /var/run/docker.sock
```

---

### 5. Install and Configure SonarQube

```bash
docker run -itd --name SonarQube-Server -p 9000:9000 sonarqube:lts-community
```

---

### 6. Install Trivy

```bash
sudo apt-get install wget apt-transport-https gnupg lsb-release -y
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update -y
sudo apt-get install trivy -y
```

---

### 7. Install and Configure ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait for all pods to be running:

```bash
watch kubectl get pods -n argocd
```

**Install ArgoCD CLI:**

```bash
curl --silent --location -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/download/v2.4.7/argocd-linux-amd64
chmod +x /usr/local/bin/argocd
```

**Expose ArgoCD via NodePort:**

```bash
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'
kubectl get svc -n argocd
```

Open the NodePort on the worker node's security group, then access:

```
http://<worker-public-ip>:<nodeport>
```

**Fetch initial admin password:**

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d; echo
```

Username: `admin` — change the password after first login.

---

### 8. Add EKS Cluster to ArgoCD

```bash
argocd login <argocd-public-ip>:<nodeport> --username admin
argocd cluster list
kubectl config get-contexts
argocd cluster add <your-eks-context-name> --name hospital-eks-cluster
```

---

### 9. Connect GitHub Repo to ArgoCD

Go to **Settings → Repositories → Connect Repo** in the ArgoCD UI and connect your GitHub repository using a Personal Access Token.

---

### 10. Jenkins Plugins to Install

Go to **Manage Jenkins → Plugins → Available plugins** and install:

- OWASP Dependency-Check
- SonarQube Scanner
- Docker
- Pipeline: Stage View

---

### 11. Configure Jenkins Credentials

Go to **Manage Jenkins → Credentials** and add:

| ID                  | Type                | Value                          |
|---------------------|---------------------|--------------------------------|
| `sonar-token`       | Secret text         | SonarQube user token           |
| `docker-creds`      | Username/Password   | DockerHub username + password  |
| `github-token`      | Username/Password   | GitHub username + PAT          |
| `email-creds`       | Username/Password   | Gmail + App Password           |

---

### 12. Configure SonarQube in Jenkins

- Go to **Manage Jenkins → Tools** → add SonarQube Scanner installation
- Go to **Manage Jenkins → System** → add SonarQube server URL + token
- In SonarQube UI: **Administration → Webhooks** → create webhook pointing to:

```
http://<jenkins-ip>:8081/sonarqube-webhook/
```

---

### 13. Configure OWASP in Jenkins

Go to **Manage Jenkins → Tools** → add Dependency-Check installation (select "Install automatically").

---

### 14. Dockerfiles for All Services

Your backend already has a Dockerfile. Create Dockerfiles for frontend and dashboard:

**frontend/Dockerfile:**

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**dashboard/Dockerfile:**

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

### 15. Jenkins Pipeline (Jenkinsfile)

Create a `Jenkinsfile` at the root of your repo:

```groovy
pipeline {
    agent any

    environment {
        DOCKER_IMAGE_BACKEND  = "your-dockerhub-username/hospital-backend"
        DOCKER_IMAGE_FRONTEND = "your-dockerhub-username/hospital-frontend"
        DOCKER_IMAGE_DASHBOARD = "your-dockerhub-username/hospital-dashboard"
        IMAGE_TAG = "${BUILD_NUMBER}"
        SONAR_PROJECT_KEY = "hospital-app"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main', credentialsId: 'github-token', url: 'https://github.com/your-username/your-repo.git'
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                dependencyCheck additionalArguments: '--scan ./ --format HTML', odcInstallation: 'OWASP-DC'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage('Trivy Filesystem Scan') {
            steps {
                sh 'trivy fs --format table -o trivy-report.html .'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube-Server') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                          -Dsonar.sources=. \
                          -Dsonar.exclusions=**/node_modules/**
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build -t ${DOCKER_IMAGE_BACKEND}:${IMAGE_TAG} ./BACKEND
                    docker build -t ${DOCKER_IMAGE_FRONTEND}:${IMAGE_TAG} ./frontend
                    docker build -t ${DOCKER_IMAGE_DASHBOARD}:${IMAGE_TAG} ./dashboard
                '''
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                    trivy image --format table -o trivy-backend.html ${DOCKER_IMAGE_BACKEND}:${IMAGE_TAG}
                    trivy image --format table -o trivy-frontend.html ${DOCKER_IMAGE_FRONTEND}:${IMAGE_TAG}
                    trivy image --format table -o trivy-dashboard.html ${DOCKER_IMAGE_DASHBOARD}:${IMAGE_TAG}
                '''
            }
        }

        stage('Push Docker Images') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                        docker push ${DOCKER_IMAGE_BACKEND}:${IMAGE_TAG}
                        docker push ${DOCKER_IMAGE_FRONTEND}:${IMAGE_TAG}
                        docker push ${DOCKER_IMAGE_DASHBOARD}:${IMAGE_TAG}
                    '''
                }
            }
        }

        stage('Update K8s Manifests') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-token', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    sh '''
                        sed -i "s|${DOCKER_IMAGE_BACKEND}:.*|${DOCKER_IMAGE_BACKEND}:${IMAGE_TAG}|g" k8s/backend-deployment.yaml
                        sed -i "s|${DOCKER_IMAGE_FRONTEND}:.*|${DOCKER_IMAGE_FRONTEND}:${IMAGE_TAG}|g" k8s/frontend-deployment.yaml
                        sed -i "s|${DOCKER_IMAGE_DASHBOARD}:.*|${DOCKER_IMAGE_DASHBOARD}:${IMAGE_TAG}|g" k8s/dashboard-deployment.yaml
                        git config user.email "jenkins@ci.com"
                        git config user.name "Jenkins"
                        git add k8s/
                        git commit -m "Update image tags to ${IMAGE_TAG}" || echo "No changes"
                        git push https://${GIT_USER}:${GIT_TOKEN}@github.com/your-username/your-repo.git main
                    '''
                }
            }
        }
    }

    post {
        always {
            emailext(
                subject: "Pipeline ${currentBuild.result}: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Build ${currentBuild.result}. Check: ${env.BUILD_URL}",
                to: '[email]',
                credentialsId: 'email-creds'
            )
        }
    }
}
```

---

### 16. Kubernetes Manifests

Create a `k8s/` folder at the root with these files:

**k8s/backend-deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hospital-backend
  namespace: hospital
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hospital-backend
  template:
    metadata:
      labels:
        app: hospital-backend
    spec:
      containers:
        - name: backend
          image: your-dockerhub-username/hospital-backend:latest
          ports:
            - containerPort: 4000
          envFrom:
            - secretRef:
                name: backend-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: hospital-backend-svc
  namespace: hospital
spec:
  selector:
    app: hospital-backend
  ports:
    - port: 4000
      targetPort: 4000
  type: ClusterIP
```

**k8s/frontend-deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hospital-frontend
  namespace: hospital
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hospital-frontend
  template:
    metadata:
      labels:
        app: hospital-frontend
    spec:
      containers:
        - name: frontend
          image: your-dockerhub-username/hospital-frontend:latest
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: hospital-frontend-svc
  namespace: hospital
spec:
  selector:
    app: hospital-frontend
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
  type: NodePort
```

**k8s/dashboard-deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hospital-dashboard
  namespace: hospital
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hospital-dashboard
  template:
    metadata:
      labels:
        app: hospital-dashboard
    spec:
      containers:
        - name: dashboard
          image: your-dockerhub-username/hospital-dashboard:latest
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: hospital-dashboard-svc
  namespace: hospital
spec:
  selector:
    app: hospital-dashboard
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30081
  type: NodePort
```

---

### 17. Create ArgoCD Application

In the ArgoCD UI go to **Applications → New App**:

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| App Name           | hospital-app                               |
| Project            | default                                    |
| Sync Policy        | Automatic                                  |
| Repo URL           | your GitHub repo URL                       |
| Path               | k8s/                                       |
| Cluster            | hospital-eks-cluster                       |
| Namespace          | hospital                                   |

> **Important:** Enable **Auto-Create Namespace** when creating the app.

ArgoCD will now watch your `k8s/` folder and auto-deploy whenever Jenkins pushes updated image tags.

---

### 18. Email Notifications Setup

- Open port **465** on your Jenkins EC2 security group
- Generate a Gmail App Password: **Google Account → Security → App Passwords**
- Add it as `email-creds` credential in Jenkins
- Go to **Manage Jenkins → System → Extended E-mail Notification** and configure SMTP:
  - SMTP server: `smtp.gmail.com`
  - Port: `465`
  - Use SSL: checked

---

## Monitoring with Prometheus and Grafana (via Helm)

**Install Helm:**

```bash
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
```

**Add repos and install:**

```bash
helm repo add stable https://charts.helm.sh/stable
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
kubectl create namespace prometheus
helm install stable prometheus-community/kube-prometheus-stack -n prometheus
```

**Expose Prometheus and Grafana via NodePort:**

```bash
kubectl edit svc stable-kube-prometheus-sta-prometheus -n prometheus
# Change type: ClusterIP → NodePort

kubectl edit svc stable-grafana -n prometheus
# Change type: ClusterIP → NodePort
```

**Get Grafana password:**

```bash
kubectl get secret --namespace prometheus stable-grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode; echo
```

Username: `admin`

Access Grafana at `http://<worker-public-ip>:<grafana-nodeport>` and import the Kubernetes dashboards.

---

## Clean Up

```bash
eksctl delete cluster --name=hospital-app --region=us-west-1
```

---

## Architecture Diagram

> 🎨 **Interactive animated diagram:** Open [`architecture.html`](./architecture.html) in your browser for the full animated version with icons, color-coded flows, and live data-flow animations.



### Full CI/CD Pipeline Flow

```mermaid
flowchart TD
    DEV(["👨‍💻 Developer\nLocal Machine"])
    GH(["🐙 GitHub\nSource Repository"])
    JK(["⚙️ Jenkins CI\nEC2 t2.medium :8081"])
    OWASP(["🔍 OWASP\nDependency Check"])
    TRIVYFS(["🛡️ Trivy\nFilesystem Scan"])
    SQ(["📊 SonarQube\nCode Quality :9000"])
    QG{{"✅ Quality\nGate"}}
    DOCKER(["🐳 Docker\nBuild Images"])
    TRIVYIMG(["🛡️ Trivy\nImage Scan"])
    DHUB(["📦 DockerHub\nImage Registry"])
    K8SREPO(["📝 GitHub\nk8s/ Manifests"])
    ARGO(["🔄 ArgoCD\nCD Controller"])
    EKS(["☸️ AWS EKS\nKubernetes Cluster"])

    subgraph EKS_CLUSTER["AWS EKS Cluster (us-west-1)"]
        BE(["🟢 Backend Pod\nNode.js :4000"])
        FE(["🔵 Frontend Pod\nnginx :30080"])
        DA(["🟣 Dashboard Pod\nnginx :30081"])
        subgraph MONITORING["Monitoring Namespace"]
            PROM(["📈 Prometheus"])
            GRAF(["📊 Grafana"])
        end
    end

    subgraph CI_SERVER["EC2 Jenkins Master (Public Subnet)"]
        JK
        OWASP
        TRIVYFS
        SQ
        TRIVYIMG
    end

    subgraph AWS_INFRA["AWS Infrastructure (Terraform Managed)"]
        CI_SERVER
        EKS_CLUSTER
    end

    DEV -->|"git push"| GH
    GH -->|"webhook trigger"| JK
    JK --> OWASP
    OWASP --> TRIVYFS
    TRIVYFS --> SQ
    SQ --> QG
    QG -->|"❌ Fail → abort"| JK
    QG -->|"✅ Pass"| DOCKER
    DOCKER -->|"3 images built\nbackend / frontend / dashboard"| TRIVYIMG
    TRIVYIMG --> DHUB
    DHUB -->|"image tags updated\nin k8s/ manifests"| K8SREPO
    K8SREPO -->|"git push"| GH
    GH -->|"manifest change\ndetected"| ARGO
    ARGO -->|"sync & deploy"| EKS_CLUSTER
    EKS_CLUSTER --> BE
    EKS_CLUSTER --> FE
    EKS_CLUSTER --> DA
    PROM -->|"scrapes metrics"| EKS_CLUSTER
    GRAF -->|"visualizes"| PROM

    JK -->|"📧 email notify\n(success/fail)"| DEV

    style DEV fill:#f0f4ff,stroke:#4a6cf7
    style GH fill:#24292e,color:#fff,stroke:#24292e
    style JK fill:#d33833,color:#fff,stroke:#b71c1c
    style SQ fill:#4e9bcd,color:#fff,stroke:#1565c0
    style DHUB fill:#0db7ed,color:#fff,stroke:#0277bd
    style ARGO fill:#ef7b4d,color:#fff,stroke:#e64a19
    style EKS fill:#ff9900,color:#fff,stroke:#e65100
    style BE fill:#c8e6c9,stroke:#388e3c
    style FE fill:#bbdefb,stroke:#1976d2
    style DA fill:#e1bee7,stroke:#7b1fa2
    style PROM fill:#e65100,color:#fff,stroke:#bf360c
    style GRAF fill:#f57c00,color:#fff,stroke:#e65100
    style AWS_INFRA fill:#fff8e1,stroke:#f9a825,stroke-dasharray:6
    style CI_SERVER fill:#fce4ec,stroke:#c62828,stroke-dasharray:4
    style EKS_CLUSTER fill:#e8f5e9,stroke:#2e7d32,stroke-dasharray:4
    style MONITORING fill:#fff3e0,stroke:#ef6c00,stroke-dasharray:3
```

---

### Infrastructure Architecture (Terraform Provisioned)

```mermaid
flowchart TD
    subgraph AWS["☁️ AWS Cloud — us-west-1"]
        subgraph VPC["VPC  10.0.0.0/16"]
            subgraph PUB["Public Subnets (10.0.1.0/24 · 10.0.2.0/24)"]
                EC2(["🖥️ EC2 t2.medium\nJenkins :8081\nSonarQube :9000\nTrivy\nDocker"])
                NAT(["🌐 NAT Gateway"])
                IGW(["🔌 Internet Gateway"])
            end
            subgraph PRIV["Private Subnets (10.0.3.0/24 · 10.0.4.0/24)"]
                subgraph NG["EKS Node Group (2× t2.medium)"]
                    N1(["Worker Node 1"])
                    N2(["Worker Node 2"])
                end
            end
        end
        EKS_CP(["☸️ EKS Control Plane\nhospital-app-cluster v1.30"])
        S3(["🗄️ S3 Bucket\nTerraform Remote State"])
        IAM(["🔐 IAM\nOIDC Provider\n+ Node Role"])
    end

    subgraph EXTERNAL["External Services"]
        GH(["🐙 GitHub"])
        DHUB(["📦 DockerHub"])
        GMAIL(["📧 Gmail SMTP"])
    end

    DEV(["👨‍💻 Developer"])

    DEV -->|"terraform apply"| AWS
    DEV -->|"git push"| GH
    IGW <-->|"internet"| EC2
    EC2 -->|"private traffic"| NAT
    NAT --> PRIV
    EKS_CP -->|"manages"| NG
    EC2 -->|"kubectl / argocd"| EKS_CP
    GH -->|"webhook"| EC2
    EC2 -->|"push images"| DHUB
    DHUB -->|"pull images"| NG
    EC2 -->|"notify"| GMAIL
    IAM -->|"auth"| EKS_CP

    style AWS fill:#fff8e1,stroke:#f9a825
    style VPC fill:#e3f2fd,stroke:#1565c0
    style PUB fill:#e8f5e9,stroke:#2e7d32
    style PRIV fill:#fce4ec,stroke:#c62828
    style EC2 fill:#d33833,color:#fff,stroke:#b71c1c
    style EKS_CP fill:#ff9900,color:#fff,stroke:#e65100
    style S3 fill:#569a31,color:#fff,stroke:#33691e
    style IAM fill:#dd344c,color:#fff,stroke:#b71c1c
    style GH fill:#24292e,color:#fff,stroke:#24292e
    style DHUB fill:#0db7ed,color:#fff,stroke:#0277bd
    style GMAIL fill:#ea4335,color:#fff,stroke:#c62828
    style EXTERNAL fill:#f3e5f5,stroke:#7b1fa2,stroke-dasharray:5
    style NG fill:#fff9c4,stroke:#f57f17
```

---

### Jenkins Pipeline Stages

```mermaid
flowchart LR
    S1(["1️⃣ Checkout\nGitHub → Jenkins"])
    S2(["2️⃣ OWASP\nDependency Check"])
    S3(["3️⃣ Trivy\nFS Scan"])
    S4(["4️⃣ SonarQube\nAnalysis"])
    S5{{"5️⃣ Quality\nGate"}}
    S6(["6️⃣ Docker Build\n× 3 images"])
    S7(["7️⃣ Trivy\nImage Scan × 3"])
    S8(["8️⃣ Docker Push\nto DockerHub"])
    S9(["9️⃣ Update k8s/\nManifests + git push"])
    S10(["🔟 ArgoCD\nAuto Sync → EKS"])
    FAIL(["❌ Abort +\nEmail Alert"])

    S1 --> S2 --> S3 --> S4 --> S5
    S5 -->|"pass"| S6
    S5 -->|"fail"| FAIL
    S6 --> S7 --> S8 --> S9 --> S10

    style S1 fill:#e3f2fd,stroke:#1565c0
    style S2 fill:#fff3e0,stroke:#e65100
    style S3 fill:#fce4ec,stroke:#c62828
    style S4 fill:#4e9bcd,color:#fff,stroke:#1565c0
    style S5 fill:#f3e5f5,stroke:#7b1fa2
    style S6 fill:#e8f5e9,stroke:#2e7d32
    style S7 fill:#fce4ec,stroke:#c62828
    style S8 fill:#0db7ed,color:#fff,stroke:#0277bd
    style S9 fill:#fff9c4,stroke:#f57f17
    style S10 fill:#ef7b4d,color:#fff,stroke:#e64a19
    style FAIL fill:#d32f2f,color:#fff,stroke:#b71c1c
```


---

## Infrastructure as Code with Terraform

### Files Overview

```
terraform/
├── providers.tf          # AWS + Kubernetes providers, S3 remote state backend
├── main.tf               # VPC, EKS cluster, EC2 Jenkins master, Security Groups
├── variables.tf          # All input variables with defaults
├── outputs.tf            # Useful outputs (IPs, URLs, kubectl command)
├── terraform.tfvars      # Your actual values (fill this in)
└── scripts/
    └── jenkins-install.sh  # EC2 user_data: installs Jenkins, Docker, SonarQube, Trivy
```

### What Terraform Provisions

| Resource              | Details                                              |
|-----------------------|------------------------------------------------------|
| VPC                   | Custom VPC with public + private subnets across 2 AZs |
| NAT Gateway           | Single NAT for private subnet outbound traffic       |
| EKS Cluster           | v1.30, nodes in private subnets                      |
| EKS Node Group        | 2x t2.medium, 29GB disk                              |
| EC2 Jenkins Master    | t2.medium, 29GB, Ubuntu 22.04                        |
| Security Group        | Opens ports 22, 8081, 9000, 465, 80, 443             |
| Bootstrap Script      | Auto-installs Jenkins, Docker, SonarQube, Trivy, kubectl, AWS CLI |

### Steps to Run Terraform

**1. Install Terraform:**

```bash
sudo apt-get update && sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | \
  sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform -y
terraform -version
```

**2. Create S3 bucket for remote state (one-time, manual):**

```bash
aws s3api create-bucket \
  --bucket hospital-app-terraform-state \
  --region us-west-1 \
  --create-bucket-configuration LocationConstraint=us-west-1
```

**3. Fill in your values in `terraform/terraform.tfvars`:**

```hcl
key_pair_name = "your-existing-keypair-name"
ec2_ami       = "ami-0d53d72369335a9d6"   # Ubuntu 22.04 us-west-1
```

**4. Initialize and apply:**

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

**5. After apply, configure kubectl:**

```bash
# Terraform outputs this exact command for you:
aws eks update-kubeconfig --region us-west-1 --name hospital-app-cluster
kubectl get nodes
```

**6. Get your Jenkins and SonarQube URLs from Terraform output:**

```bash
terraform output jenkins_url
terraform output sonarqube_url
terraform output jenkins_master_public_ip
```

### Destroy Infrastructure

```bash
cd terraform
terraform destroy
```

---

## Complete File Count Summary

| File                              | Purpose                                      |
|-----------------------------------|----------------------------------------------|
| `BACKEND/Dockerfile`              | Backend Node.js container (already existed)  |
| `frontend/Dockerfile`             | Frontend React/Vite → nginx container        |
| `dashboard/Dockerfile`            | Dashboard React/Vite → nginx container       |
| `frontend/nginx.conf`             | nginx config for React Router SPA routing    |
| `dashboard/nginx.conf`            | nginx config for React Router SPA routing    |
| `Jenkinsfile`                     | Full CI pipeline (OWASP, Trivy, Sonar, Docker, push) |
| `terraform/providers.tf`          | AWS provider + S3 backend config             |
| `terraform/main.tf`               | VPC, EKS, EC2, Security Groups               |
| `terraform/variables.tf`          | All input variables                          |
| `terraform/outputs.tf`            | Outputs: IPs, URLs, kubectl command          |
| `terraform/terraform.tfvars`      | Your environment-specific values             |
| `terraform/scripts/jenkins-install.sh` | EC2 bootstrap script                    |
| `k8s/backend-deployment.yaml`     | Backend K8s Deployment + Service            |
| `k8s/frontend-deployment.yaml`    | Frontend K8s Deployment + Service (NodePort 30080) |
| `k8s/dashboard-deployment.yaml`   | Dashboard K8s Deployment + Service (NodePort 30081) |
