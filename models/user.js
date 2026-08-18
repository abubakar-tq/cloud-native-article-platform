'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            User.hasMany(models.Article, {
                as: 'articles',
                foreignKey: 'userId'
            })
        }
    }

    User.init(
        {
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: {
                        msg: 'Please provide a valid email address.'
                    }
                }
            },
            passwordHash: {
                type: DataTypes.STRING,
                allowNull: true
            },
            otpHash: {
                type: DataTypes.STRING,
                allowNull: true
            },
            otpExpiresAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            isVerified: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            resetTokenHash: {
                type: DataTypes.STRING,
                allowNull: true
            },
            resetTokenExpiresAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            isAdmin: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            isBlocked: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            blockedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            blockedBy: {
                type: DataTypes.INTEGER,
                allowNull: true
            }
        },
        {
            sequelize,
            modelName: 'User'
        }
    )

    return User
}
