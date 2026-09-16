pipeline {
    agent any
    stages {
        stage('Verify tools') {
            steps {
                sh 'terraform version'
                sh 'kubectl version --client'
                sh 'docker --version'
            }
        }
    }
}