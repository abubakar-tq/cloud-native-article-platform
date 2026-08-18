'use strict'

module.exports = {
    up: async(queryInterface, Sequelize) => {
        await queryInterface.addColumn('Users', 'resetTokenHash', {
            type: Sequelize.STRING,
            allowNull: true
        })

        await queryInterface.addColumn('Users', 'resetTokenExpiresAt', {
            type: Sequelize.DATE,
            allowNull: true
        })
    },

    down: async(queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Users', 'resetTokenHash')
        await queryInterface.removeColumn('Users', 'resetTokenExpiresAt')
    }
}