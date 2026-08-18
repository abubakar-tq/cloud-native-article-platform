'use strict'

module.exports = {
    up: async(queryInterface, Sequelize) => {
        // Make the first user an admin (if any users exist)
        await queryInterface.sequelize.query(`
            UPDATE "Users" 
            SET "isAdmin" = true 
            WHERE id = (SELECT MIN(id) FROM "Users")
        `)
    },

    down: async(queryInterface, Sequelize) => {
        // Remove admin status from all users
        await queryInterface.bulkUpdate('Users', {
            isAdmin: false
        }, {})
    }
}