class Controller {
<<<<<<< HEAD
    boot(req,res,next){
        this.req = req
        this.res = res
        this.next = next
        return this;
    }

    async healthCheck(){
        try{
            this.res.send({
                status:true,
                statusCode:200,
                message: 'Server is up & running',
                data:{}
            })
        }catch(e){
            console.log("Error on health check:\n",e)
            this.res.send({
                status:false,
                statusCode:500,
                message:'Internal server error',
                data:null
            })
        }
    }
}

module.exports = Controller
=======
  boot(req, res, next) {
    this.req = req;
    this.res = res;
    this.next = next;
    return this;
  }

  async healthCheck() {
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
}

module.exports = Controller;
>>>>>>> 30ed529 (Initial commit)
