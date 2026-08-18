'use strict'

module.exports = {
    up: async(queryInterface, Sequelize) => {
        await queryInterface.createTable('ArticleMedia', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            articleId: {
                allowNull: false,
                type: Sequelize.INTEGER,
                references: {
                    model: 'Articles',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            type: {
                allowNull: false,
                type: Sequelize.ENUM('image', 'document', 'video')
            },
            title: {
                allowNull: true,
                type: Sequelize.STRING
            },
            description: {
                allowNull: true,
                type: Sequelize.TEXT
            },
            storagePath: {
                allowNull: true,
                type: Sequelize.STRING
            },
            externalUrl: {
                allowNull: true,
                type: Sequelize.TEXT
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

        await queryInterface.addIndex('ArticleMedia', ['articleId'])
        await queryInterface.addIndex('ArticleMedia', ['type'])
    },

    down: async(queryInterface) => {
        await queryInterface.removeIndex('ArticleMedia', ['type'])
        await queryInterface.removeIndex('ArticleMedia', ['articleId'])
        await queryInterface.dropTable('ArticleMedia')
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ArticleMedia_type";')
    }
}
