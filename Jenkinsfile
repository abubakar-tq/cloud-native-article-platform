pipeline {
    agent any
    environment {
        TF_VAR_localstack_endpoint = 'http://host.docker.internal:4566'
        LOCALSTACK_AUTH_TOKEN = credentials('localstack-auth-token')
    }
    stages {
        stage('Start LocalStack') {
            steps {
                sh 'docker compose up -d localstack'
            }
        }
        stage('Wait for LocalStack') {
            steps {
                sh 'timeout 120 sh -c "until curl -sf http://host.docker.internal:4566/_localstack/health; do sleep 5; done"'
            }
        }
        stage('Provision Infrastructure') {
         steps {
            dir('infra') {
              sh 'terraform init'
              sh 'terraform plan -out=tfplan'
              sh 'terraform apply -auto-approve tfplan'
                }
         }
        }
        stage('Prepare Kubeconfig') {
            steps {
                sh 'docker cp localstack:/root/.kube/config ./kubeconfig'
                sh "sed -i 's#https://0.0.0.0#https://kubernetes#' ./kubeconfig"
            }
        }
        stage('Install Monitoring Stack') {
            steps {
                sh 'helm repo add prometheus-community https://prometheus-community.github.io/helm-charts --force-update'
                sh 'helm repo update'
                sh 'helm --kubeconfig ./kubeconfig upgrade --install monitoring prometheus-community/kube-prometheus-stack -f monitoring/values.yaml --create-namespace --namespace monitoring --wait --timeout 10m'
            }
        }
        stage('Deploy App'){
            steps{
                withCredentials([file(credentialsId: 'k8s-secret-yaml', variable: 'SECRET_FILE')]) {
                    sh 'cp -f $SECRET_FILE k8s/02-secret.yaml'
                }
                sh 'kubectl --kubeconfig ./kubeconfig apply -f k8s/'
            }
        }
    }
}