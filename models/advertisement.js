'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
    class Advertisement extends Model {
        static associate() {
            // No associations yet
        }
    }

    Advertisement.init(
        {
            title: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Title is required.'
                    }
                }
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Content is required.'
                    }
                }
            },
            imageUrl: {
                type: DataTypes.STRING,
                allowNull: true
            },
            linkUrl: {
                type: DataTypes.STRING,
                allowNull: true
            },
            position: {
                type: DataTypes.ENUM('sidebar', 'header', 'footer', 'inline'),
                allowNull: false,
                defaultValue: 'sidebar'
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            priority: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            }
        },
        {
            sequelize,
            modelName: 'Advertisement'
        }
    )

    return Advertisement
}
