'use strict'
const bcrypt = require('bcryptjs')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if admin user already exists
    const [users] = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email = 'admin@devops.local' LIMIT 1`
    )

    if (users.length === 0) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('Admin@1234', 10)
      
      await queryInterface.bulkInsert('Users', [{
        email: 'admin@devops.local',
        passwordHash: hashedPassword,
        isAdmin: true,
        isVerified: true,
        isBlocked: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }], {})

      console.log('✅ Default admin user created:')
      console.log('   Email: admin@devops.local')
      console.log('   Password: Admin@1234')
      console.log('   ⚠️  Please change this password after first login!')
    } else {
      console.log('ℹ️  Admin user already exists, skipping creation')
      
      // Make sure the first user is admin (fallback)
      await queryInterface.sequelize.query(`
        UPDATE "Users" 
        SET "isAdmin" = true 
        WHERE id = (SELECT MIN(id) FROM "Users")
      `)
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', {
      email: 'admin@devops.local'
    }, {})
  }
}
