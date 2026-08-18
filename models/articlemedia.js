'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
    class ArticleMedia extends Model {
        static associate(models) {
            ArticleMedia.belongsTo(models.Article, {
                as: 'article',
                foreignKey: 'articleId'
            })
        }
    }

    ArticleMedia.init(
        {
            articleId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            type: {
                type: DataTypes.ENUM('image', 'document', 'video'),
                allowNull: false
            },
            title: {
                type: DataTypes.STRING,
                allowNull: true
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            storagePath: {
                type: DataTypes.STRING,
                allowNull: true
            },
            externalUrl: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    isUrl: {
                        msg: 'Provide a valid URL for external media.'
                    }
                }
            }
        },
        {
            sequelize,
            modelName: 'ArticleMedia'
        }
    )

    return ArticleMedia
}
