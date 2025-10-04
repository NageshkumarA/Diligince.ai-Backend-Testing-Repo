<<<<<<< HEAD
const BaseController = require("../Base/Controller")

class UserController extends BaseController {
    async createUser() {
        try {
            this.res.send({
                status: true,
                statusCode: 200,
                message: 'Server is up & running',
                data: {}
            })
        } catch (e) {
            console.log("Error on health check:\n", e)
            this.res.send({
                status: false,
                statusCode: 500,
                message: 'Internal server error',
                data: null
            })
        }
    }

    async getProfile() {
        try {
            this.res.send({
                status: true,
                statusCode: 200,
                message: 'User Data',
                data: {}
            })
        } catch (e) {
            console.log("Error on health check:\n", e)
            this.res.send({
                status: false,
                statusCode: 500,
                message: 'Internal server error',
                data: null
            })
        }
    }
}

module.exports = UserController
=======
const BaseController = require("../Base/Controller");

class UserController extends BaseController {
  constructor(req, res, next) {
    super(); // call BaseController constructor
    this.req = req;
    this.res = res;
    this.next = next;
  }

  async createUser() {
    try {
      this.res.send({
        status: true,
        statusCode: 200,
        message: "Server is up & running",
        data: {},
      });
    } catch (e) {
      console.log("Error on health check:\n", e);
      this.res.send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getProfile() {
    try {
      this.res.send({
        status: true,
        statusCode: 200,
        message: "User Data",
        data: {},
      });
    } catch (e) {
      console.log("Error on health check:\n", e);
      this.res.send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }
}

module.exports = UserController;
>>>>>>> 30ed529 (Initial commit)
