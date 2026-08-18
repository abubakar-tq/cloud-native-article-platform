'use strict'

module.exports = {
    up: async(queryInterface, Sequelize) => {
        // Check if visibility column exists before adding it
        const tableDescription = await queryInterface.describeTable('Articles')
        
        if (!tableDescription.visibility) {
            await queryInterface.addColumn('Articles', 'visibility', {
                type: Sequelize.ENUM('public', 'private'),
                allowNull: false,
                defaultValue: 'public'
            })
        }

        if (!tableDescription.userId) {
            await queryInterface.addColumn('Articles', 'userId', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'Users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            })
        }

        // Add indexes only if they don't exist (Sequelize will skip if they exist)
        try {
            await queryInterface.addIndex('Articles', ['visibility'])
        } catch (error) {
            // Index might already exist, ignore
        }
        
        try {
            await queryInterface.addIndex('Articles', ['userId'])
        } catch (error) {
            // Index might already exist, ignore
        }
    },

    down: async(queryInterface, Sequelize) => {
        await queryInterface.removeIndex('Articles', ['userId'])
        await queryInterface.removeIndex('Articles', ['visibility'])
        await queryInterface.removeColumn('Articles', 'userId')
        await queryInterface.removeColumn('Articles', 'visibility')
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Articles_visibility";')
    }
}
