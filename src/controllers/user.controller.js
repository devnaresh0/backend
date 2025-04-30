import {asyncHanlder} from '../utils/asynchandler.js'
import ApiError from '../utils/ApiError.js'
import {User} from "../models/user.models.js"

import {uploadOnCloudinary,deleteFromCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/apiResponse.js'
import jwt from "jsonwebtoken"
import { json } from 'express'
import mongoose from 'mongoose'

const generateAccessAndRefreshToken = async(userId)=>{
try {
      const user =  await  User.findById(userId)
      // small check for user existence
    
     const accessToken = user.generateAccesToken()
     const refreshToken= user.generateRefershToken()
    
    user.refreshToken  = refreshToken
    await user.save({validateBeforeSave: false})
    return {accessToken,refreshToken}
    
} catch (error) {
    throw new ApiError(500,"Something went worng")
    
}

}

const registerUser = asyncHanlder(async (req,res) => {
    //TODO
   const {fullname,email,username,password} =  req.body

   // validation
   if (
    [fullname,username,email,password].some((field) => field?.trim() === "")
   ) {
    throw new ApiError(400,"All fileds are required")
    
   }

const existedUser = await User.findOne({
    $or: [{username},{email}]
})

if (existedUser) {
    throw new ApiError(400,"All fileds are required")
    
}

const avatarLocalPath = req.files?.avatar?.[0]?.path
const coverLocalPath = req.files?.coverImage?.[0]?.path

if (!avatarLocalPath) {
    throw new ApiError(400,"Avatar file is missing")
    
}

let avatar;
try {
   avatar = await uploadOnCloudinary(avatarLocalPath)
   console.log("Uploaded avatar",avatar);
   
} catch (error) {
    console.log("Error uploading avatar",error);
    throw new ApiError(500, "Failed to upload avatar")
    
    
}
let coverImage;
try {
   coverImage = await uploadOnCloudinary(coverLocalPath)
   console.log("Uploaded avatar",coverImage);
   
} catch (error) {
    console.log("Error uploading avatar",error);
    throw new ApiError(500, "Failed to upload coverImage")
    
    
}

// const avatar = await uploadOnCloudinary(avatarLocalPath)
// let coverImage
// if (coverLocalPath) {
//     coverImage = await uploadOnCloudinary(coverImage)

    
// }

try {
    const user= await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a use")
        
    }
    
    return res
          .status(201)
          .json(new ApiResponse(200,createdUser, "User registered successfully"))
    
    
} catch (error) {
    console.log("User creation failed");
    if (avatar) {
        await deleteFromCloudinary(avatar.public_id)
        
    }
    if (coverImage) {
        await deleteFromCloudinary(coverImage.public_id)
        
    }
    throw new ApiError(500, "Somethin went wrong and images were dleted")
    
    
}
})

const loginUser = asyncHanlder (async(req,res) => {
    // get data from body
    const {email,username,password} = req.body
    // validation
    if (!email) {
        throw new ApiError(400, "Email is required")
        
    }
    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if (!user) {
        throw new ApiError(404, "User not found")
        
    }
    // validate password
   const isPasswordValidate = await user.isPasswordCorrect(password)

if (!isPasswordValidate) {
    throw new ApiError(401,"invalid credentials")
    
}

const {accessToken,refreshToken} = await

generateAccessAndRefreshToken(user._Id)

const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
const option = {
    httpOnly:true,
    secure: process.env.NODE_ENV === "production",

}

return res
.status(20)
.cookie("accessToken",accessToken,option)
.json(new ApiResponse(200,


    
        {user: loggedInUser,accessToken,refreshToken},
        "user logged in successfully"
    
))

})
const logoutUser = asyncHanlder (async (req,res) => {
    await User.findByIdAndUpdate(
        // need to come back here after middleware
        
        req.user._id,
       {
        $set: {
            refreshToken: undefined,



        }
       },
       {new: true}
    )
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",

    }
    return res
           .status(200)
           .clearCookie("accessToken",options)
           .clearCookie("refreshToken",options)
           .json (new ApiResponse(200, {}, "User logged out successfuly"))

})


const refreshAccessToken = asyncHanlder( async (req,res)=> {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required")
        
    }

    try {
       const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRETE
        )
    const user = await User.findById(decodedToken?._id)
    if (!user) {
        throw new ApiError(401,"invalid refresh token")
        
    }

    if (incomingRefreshToken !== user?.refreshToken) 
        {
            throw new ApiError(401, "invalid refersh token")

        
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",

    }

    const {accessToken,refreshToken: newRefreshToken}=  await generateAccessAndRefreshToken(user._id)
      return res
          .status(200)
          .cookie("accessToken",accessToken,options)
          .json(new ApiResponse(200, {accessToken,refreshToken: newRefreshToken},"Access token refreshted successfully"));


    } catch (error) {
        throw new ApiError(500, "Soemthing went wrong while refreshing acces token")
        
    }
})

const changeCurruntPassword = asyncHanlder(async (req,res) => {
    const {oldPassword,newPassword} = req.body
   const user = await User.findById(req.body?._id)
   const isPasswordValid = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordValid) {
    throw new ApiError(401, "Old password is incorrect")

    
   }

   user.password = newPassword
   await user.save({validateBeforeSave: false})

   return res.status(200).json(new ApiResponse(200, {}, "Password change successfully"))






})
const getCurruntUser = asyncHanlder(async (req,res) => {
    return res.status(200).json (new ApiResponse(200, req.use, "Currunt user detials"))
})
const updateAccountDetails = asyncHanlder(async (req,res) => {
    const {fullname,email} = req.body
    if (!fullname) {
        throw new ApiError(400, "Fullname is required")

        
    }
    if (!email) {
        throw new ApiError(400, "email is rquired")
        
    }
    
const user = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set: {
                fullname,
                email: email,

            }

           
        },
        {new: true}

    ).select("-password -refreshToken")

    return res.status(200).json( new ApiResponse(200,user,"Account details updated successfully"))
})


const updateUserAvatar= asyncHanlder(async(req,res) => {
    const avatarLocalPath = req.files?.path

    if (!avatarLocalPath) {
      throw new ApiError(400, "file is required")
      
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
  
    if (!avatar.url) {
      throw new ApiError(500,"Something went wrong while uploading avatar")
  
      
    }
  
   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
          $set: {
              avatar: avatar.url,
          }
      },
      {new: true}
    ).select("-password -refreshToken")
  
    res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))
})
const updateUserCoverImage= asyncHanlder(async(req,res) => {

  const coverImageLocalPath =  req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(400,"File is required")
    
  }

 const coverImage = await uploadOnCloudinary(coverImageLocalPath)

 if (!coverImage.url) {
    throw new ApiError(500, "Soemthing went wrong while uploading coer image")
    
 }

 const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set: {
            coverImage: coverImage.url
        }
    },
    {new: true}


 ).select("-password -refreshToken")
 

return res.status(200).json (new ApiResponse(200,user,"Cover Image updated successfully"))

})

const getUserChannelProfile = asyncHanlder (async (req,res) => {
const {username} = req.params
if (!username.trim()) {
    throw new ApiError(400, "username is required")
    
}

const channel = await User.aggregate(
    [
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "Channel",
                as: "subscribers"

            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "susbscribedTo"
            }
        },
        {$addFields: {
            subscribersCount: {
                $size: "$subscribers"

            },
            channelSubscriberToCount: {
                $size: "$subscirbedTo"
            },
            isSubscribed: {
                $cond: {
                    if: {$in: [req.user?._id,"$subscribers.subscriber"]},
                    then: true,
                    else: false,
                }
            },
        },},
        {
            $project: {
                fullname: 1,
                username: 1,
                avatar: 1,
                subscriberCount: 1,
                channelSubscriberToCount: 1,
                isSubscribed: 1,
                coverImage: 1,
                email: 1
            }
        }
       
    ]
)

if(!channel?.length){
    throw new ApiError(404,"channle not found")
}

return res.status(200),json(new ApiResponse(
    200,
    channel[0],
    "Channle prfile fetched successfully"
))
}
)

const getWatchHistory = asyncHanlder (async (req,res) => {
  const user = await User.aggregate([
    {
        $match: {
            _id: new mongoose.Types.ObjectId(req.user?._id)

        }
    },
    {
        $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: [
                {
                    $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                        pipeline: [
                            {
                                $project: {
                                    fullname:1,
                                    username: 1,
                                    avatar: 1,
                                }
                            },
                            {
                                $addFields: {
                                    owner: {
                                        $fist: "$owner"


                                    }
                                }
                            }
                        ]

                    }
                }
            ]
        }
    }
  ])
  return res.status(200).json( new ApiResponse (200, user[0]?.watchHistory,
    "Watch history fetched successfully "
  ))

}
) 



export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurruntPassword,
    getCurruntUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,


}