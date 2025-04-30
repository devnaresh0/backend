import {ApiResponse} from '../utils/apiResponse.js'
import {asyncHanlder} from '../utils/asynchandler.js'


const healthCheck = asyncHanlder(async(req,res) => {
    return res
          .status(200)
          .json(new ApiResponse(200,"OK","Health check Passed"))
})


export {healthCheck}