'use strict'
const {
    Model
} = require('sequelize')
module.exports = (sequelize, DataTypes) => {
    class Complaint extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
        static associate(models) {
            // User who made the complaint
            Complaint.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'reporter'
            })

            // Admin who resolved the complaint
            Complaint.belongsTo(models.User, {
                foreignKey: 'resolvedBy',
                as: 'resolver'
            })
        }
    }
    Complaint.init({
        userId: DataTypes.INTEGER,
        targetType: DataTypes.STRING,
        targetId: DataTypes.INTEGER,
        reason: DataTypes.STRING,
        description: DataTypes.TEXT,
        status: DataTypes.STRING,
        resolvedBy: DataTypes.INTEGER,
        resolvedAt: DataTypes.DATE
    }, {
        sequelize,
        modelName: 'Complaint'
    })
    return Complaint
}
