'use strict'

module.exports = {
    up: async(queryInterface, Sequelize) => {
        await queryInterface.createTable('Advertisements', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            title: {
                type: Sequelize.STRING,
                allowNull: false
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            imageUrl: {
                type: Sequelize.STRING,
                allowNull: true
            },
            linkUrl: {
                type: Sequelize.STRING,
                allowNull: true
            },
            position: {
                type: Sequelize.ENUM('sidebar', 'header', 'footer', 'inline'),
                allowNull: false,
                defaultValue: 'sidebar'
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            priority: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
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

    down: async(queryInterface, Sequelize) => {
        await queryInterface.dropTable('Advertisements')
    }
}