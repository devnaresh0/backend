import { Router } from "express";

import { registerUser, logoutUser, loginUser, refreshAccessToken, changeCurruntPassword, getCurruntUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
const router = Router()

router.route("/register").post( 
    
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, {
            name: "coverImage",
            maxCount: 1
        },

    ]),
    registerUser)
// router.route("/test").get(healthCheck)
// secured routes

router.route("/login").post(loginUser)
router.route("/refresh-toekn").post(refreshAccessToken)

router.route("/logout").post(verifyJWT,something,logoutUser)


router.route("/logout").post(verifyJWT,logoutUser)
router.route("/change-password").post(verifyJWT,
    changeCurruntPassword
)
router.route("/currunt-user").get (verifyJWT,getCurruntUser)
router.route ("/c/:username").get(verifyJWT,getUserChannelProfile)
router.route("/update-account").patch( verifyJWT,updateAccountDetails)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImager"), updateUserCoverImage)
router.route ("history").get(verifyJWT, getWatchHistory)


export default router


