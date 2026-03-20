#!/bin/bash
set -e

apt-get update -y
apt-get install -y fontconfig openjdk-17-jre docker.io unzip wget gnupg lsb-release apt-transport-https

# ── Jenkins ──────────────────────────────────────────────────────────────────
wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/" \
  | tee /etc/apt/sources.list.d/jenkins.list > /dev/null
apt-get update -y
apt-get install -y jenkins

# Change Jenkins port to 8081
sed -i 's/Environment="JENKINS_PORT=8080"/Environment="JENKINS_PORT=8081"/' \
  /usr/lib/systemd/system/jenkins.service
systemctl daemon-reload
systemctl enable jenkins
systemctl start jenkins

# ── Docker ───────────────────────────────────────────────────────────────────
usermod -aG docker ubuntu
usermod -aG docker jenkins
chmod 777 /var/run/docker.sock
systemctl enable docker
systemctl start docker

# ── SonarQube (Docker container) ─────────────────────────────────────────────
docker run -d --name SonarQube-Server \
  --restart unless-stopped \
  -p 9000:9000 \
  sonarqube:lts-community

# ── Trivy ────────────────────────────────────────────────────────────────────
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" \
  | tee /etc/apt/sources.list.d/trivy.list
apt-get update -y
apt-get install -y trivy

# ── AWS CLI ──────────────────────────────────────────────────────────────────
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip /tmp/awscliv2.zip -d /tmp
/tmp/aws/install

# ── kubectl ──────────────────────────────────────────────────────────────────
curl -o /usr/local/bin/kubectl \
  https://amazon-eks.s3.us-west-2.amazonaws.com/1.19.6/2021-01-05/bin/linux/amd64/kubectl
chmod +x /usr/local/bin/kubectl

echo "Bootstrap complete. Jenkins running on :8081, SonarQube on :9000"
