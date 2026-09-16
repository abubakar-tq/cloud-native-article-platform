pipeline {
    agent any
    environment {
        TF_VAR_localstack_endpoint = 'http://host.docker.internal:4566'
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
              sh 'terraform plan'
              sh 'terraform apply -auto-approve'
                }
         }
        }
    }
}