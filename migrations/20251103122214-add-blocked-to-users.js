'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Users', 'isBlocked', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        })
        
        await queryInterface.addColumn('Users', 'blockedAt', {
            type: Sequelize.DATE,
            allowNull: true
        })
        
        await queryInterface.addColumn('Users', 'blockedBy', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id'
            }
        })
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Users', 'isBlocked')
        await queryInterface.removeColumn('Users', 'blockedAt')
        await queryInterface.removeColumn('Users', 'blockedBy')
    }
}
