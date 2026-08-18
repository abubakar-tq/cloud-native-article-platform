'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
    class Article extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            Article.belongsTo(models.User, {
                as: 'owner',
                foreignKey: 'userId'
            })
            Article.hasMany(models.ArticleMedia, {
                as: 'media',
                foreignKey: 'articleId',
                onDelete: 'CASCADE',
                hooks: true
            })
        }
    }

    Article.init(
        {
            title: {
                type: DataTypes.STRING,
                allowNull: false,
                set(value) {
                    // Trim user supplied titles to keep the stored value clean.
                    this.setDataValue('title', value ? value.trim() : value)
                },
                validate: {
                    notEmpty: {
                        msg: 'Title is required.'
                    },
                    len: {
                        args: [1, 255],
                        msg: 'Title must be 1-255 characters long.'
                    }
                }
            },
            body: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Body is required.'
                    }
                }
            },
            approved: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            visibility: {
                type: DataTypes.ENUM('public', 'private'),
                allowNull: false,
                defaultValue: 'public',
                validate: {
                    isIn: {
                        args: [['public', 'private']],
                        msg: 'Visibility must be public or private.'
                    }
                }
            },
            userId: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            isHidden: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            hiddenAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            hiddenBy: {
                type: DataTypes.INTEGER,
                allowNull: true
            }
        },
        {
            sequelize,
            modelName: 'Article'
        }
    )

    return Article
}
