'use strict'

module.exports = {
    up: async(queryInterface, Sequelize) => {
        await queryInterface.createTable('Users', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            email: {
                allowNull: false,
                type: Sequelize.STRING,
                unique: true
            },
            passwordHash: {
                allowNull: true,
                type: Sequelize.STRING
            },
            otpHash: {
                allowNull: true,
                type: Sequelize.STRING
            },
            otpExpiresAt: {
                allowNull: true,
                type: Sequelize.DATE
            },
            isVerified: {
                allowNull: false,
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        })
    },
    down: async(queryInterface) => {
        await queryInterface.dropTable('Users')
    }
}
