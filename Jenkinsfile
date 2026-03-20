pipeline {
    agent any

    environment {
        DOCKERHUB_USER      = "your-dockerhub-username"
        IMAGE_BACKEND       = "${DOCKERHUB_USER}/hospital-backend"
        IMAGE_FRONTEND      = "${DOCKERHUB_USER}/hospital-frontend"
        IMAGE_DASHBOARD     = "${DOCKERHUB_USER}/hospital-dashboard"
        IMAGE_TAG           = "${BUILD_NUMBER}"
        SONAR_PROJECT_KEY   = "hospital-app"
        GITHUB_REPO         = "https://github.com/your-username/your-repo.git"
        NOTIFY_EMAIL        = "your-email@gmail.com"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-token',
                    url: "${GITHUB_REPO}"
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                dependencyCheck(
                    additionalArguments: '--scan ./ --format HTML --format XML',
                    odcInstallation: 'OWASP-DC'
                )
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage('Trivy Filesystem Scan') {
            steps {
                sh 'trivy fs --format table -o trivy-fs-report.html .'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube-Server') {
                    sh """
                        sonar-scanner \
                          -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                          -Dsonar.sources=. \
                          -Dsonar.exclusions=**/node_modules/**,**/dist/**
                    """
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
                sh """
                    docker build -t ${IMAGE_BACKEND}:${IMAGE_TAG}   ./BACKEND
                    docker build -t ${IMAGE_FRONTEND}:${IMAGE_TAG}  ./frontend
                    docker build -t ${IMAGE_DASHBOARD}:${IMAGE_TAG} ./dashboard
                """
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh """
                    trivy image --format table -o trivy-backend.html   ${IMAGE_BACKEND}:${IMAGE_TAG}
                    trivy image --format table -o trivy-frontend.html  ${IMAGE_FRONTEND}:${IMAGE_TAG}
                    trivy image --format table -o trivy-dashboard.html ${IMAGE_DASHBOARD}:${IMAGE_TAG}
                """
            }
        }

        stage('Push Docker Images') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                        docker push ${IMAGE_BACKEND}:${IMAGE_TAG}
                        docker push ${IMAGE_FRONTEND}:${IMAGE_TAG}
                        docker push ${IMAGE_DASHBOARD}:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('Update K8s Manifests') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-token',
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_TOKEN'
                )]) {
                    sh """
                        sed -i "s|${IMAGE_BACKEND}:.*|${IMAGE_BACKEND}:${IMAGE_TAG}|g"   k8s/backend-deployment.yaml
                        sed -i "s|${IMAGE_FRONTEND}:.*|${IMAGE_FRONTEND}:${IMAGE_TAG}|g"  k8s/frontend-deployment.yaml
                        sed -i "s|${IMAGE_DASHBOARD}:.*|${IMAGE_DASHBOARD}:${IMAGE_TAG}|g" k8s/dashboard-deployment.yaml

                        git config user.email "jenkins@ci.com"
                        git config user.name "Jenkins CI"
                        git add k8s/
                        git commit -m "ci: update image tags to build-${IMAGE_TAG}" || echo "No changes to commit"
                        git push https://\${GIT_USER}:\${GIT_TOKEN}@github.com/your-username/your-repo.git main
                    """
                }
            }
        }
    }

    post {
        success {
            emailext(
                subject: "✅ Build SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Build passed. View details: ${env.BUILD_URL}",
                to: "${NOTIFY_EMAIL}",
                credentialsId: 'email-creds'
            )
        }
        failure {
            emailext(
                subject: "❌ Build FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Build failed. View details: ${env.BUILD_URL}",
                to: "${NOTIFY_EMAIL}",
                credentialsId: 'email-creds'
            )
        }
    }
}
