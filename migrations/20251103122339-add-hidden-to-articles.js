'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Articles', 'isHidden', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        })
        
        await queryInterface.addColumn('Articles', 'hiddenAt', {
            type: Sequelize.DATE,
            allowNull: true
        })
        
        await queryInterface.addColumn('Articles', 'hiddenBy', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id'
            }
        })
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Articles', 'isHidden')
        await queryInterface.removeColumn('Articles', 'hiddenAt')
        await queryInterface.removeColumn('Articles', 'hiddenBy')
    }
}
