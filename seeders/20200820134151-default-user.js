'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
      await queryInterface.bulkInsert('Users', [{
        Username: "Admin",
        Name: "The Admin",
        Email: "admin@nodeportal.com",
        Position: "Admin",
        Phone: "011",
        Password: "$2a$10$UVNx7FseM.reS.Xu1xvBQOfJIXdELJRTKatsbDF9fg5KvhBYtW7w.",
        Photo: "default.png",
        isActive: true,
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date()
       }], {});
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
