import mongoose from "mongoose"
import dotenv from "dotenv"
import bcrypt from "bcryptjs"

import User from "../models/User.js"
import Channel from "../models/Channel.js"
import Video from "../models/Video.js"
import Comment from "../models/Comment.js"
import { buildAvatarUrl, buildChannelBannerUrl, getThumbnailUrl } from "../utils/helpers.js"

dotenv.config()

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/youtube-clone"

// ================= CONNECT =================
await mongoose.connect(mongoUri)
console.log("✅ MongoDB connected")

// ================= CLEAR =================
console.log("🧹 Clearing DB...")
await mongoose.connection.db.dropDatabase()
console.log("🔥 DB cleared")

// ================= HELPERS =================
const getRandom = (min, max) => Math.floor(Math.random() * (max - min) + min)

// ================= YOUTUBE VIDEOS DATA =================
const youtubeVideos = [
    { title: "React in 100 Seconds", id: "Tn6-PIqc4UM", category: "Tech" },
    { title: "Node.js Crash Course", id: "fBNz5xF-Kx4", category: "Tech" },
    { title: "MongoDB Tutorial", id: "ofme2o29ngU", category: "Tech" },
    { title: "JavaScript Basics", id: "PkZNo7MFNFg", category: "Tech" },
    { title: "Express JS Guide", id: "L72fhGm1tfE", category: "Tech" },

    { title: "Shape of You", id: "JGwWNGJdvx8", category: "Music" },
    { title: "Blinding Lights", id: "4NRXx6U8ABQ", category: "Music" },
    { title: "Faded", id: "60ItHLz5WEA", category: "Music" },
    { title: "Believer", id: "7wtfhZwyrcc", category: "Music" },
    { title: "Closer", id: "PT2_F-1esPk", category: "Music" },

    { title: "GTA 5 Gameplay", id: "QkkoHAzjnUs", category: "Gaming" },
    { title: "Minecraft Survival", id: "MmB9b5njVbA", category: "Gaming" },
    { title: "PUBG Tips", id: "uCd6tbUAy6o", category: "Gaming" },
    { title: "Valorant Highlights", id: "hhlgphVf-1g", category: "Gaming" },

    { title: "Physics Basics", id: "8mAITcNt710", category: "Education" },
    { title: "Python Full Course", id: "kqtD5dpn9C8", category: "Education" },
    { title: "World History", id: "xuCn8ux2gbs", category: "Education" },
    { title: "Learn Python", id: "rfscVS0vtbw", category: "Education" },

    { title: "Funny Moments", id: "mea1M_DAqcI", category: "Entertainment" },
    { title: "Viral Videos", id: "Mn_CHzm7vwA", category: "Entertainment" },

    { title: "Cricket Highlights", id: "edYCtaNueQY", category: "Sports" },
    { title: "Football Goals", id: "3ZeTPA17-UE", category: "Sports" },

    { title: "AI Explained", id: "2ePf9rue1Ao", category: "Other" },
]

// ================= USERS =================
console.log("\n👥 Creating users...")

const rawUsers = [
    { userId: "user_1", username: "TechGuru", email: "tech@mail.com" },
    { userId: "user_2", username: "MusicLover", email: "music@mail.com" },
    { userId: "user_3", username: "GameMaster", email: "game@mail.com" },
    { userId: "user_4", username: "EduPro", email: "edu@mail.com" },
    { userId: "user_5", username: "FunZone", email: "fun@mail.com" },
]

const users = []

for (let u of rawUsers) {
    const hashedPassword = await bcrypt.hash("Password123", 10)

    const user = await User.create({
        ...u,
        password: hashedPassword,
        avatar: buildAvatarUrl(u.username),
    })

    users.push(user)
    console.log(`✅ User created: ${u.username}`)
}

// ================= CHANNELS =================
console.log("\n📺 Creating channels...")
const channels = []

for (let i = 0; i < users.length; i++) {
    const channel = await Channel.create({
        channelId: `ch_${i + 1}`,
        channelName: `${users[i].username} Channel`,
        owner: users[i]._id,
        description: `Welcome to ${users[i].username} Channel! Here you will find amazing content.`,
        channelBanner: buildChannelBannerUrl(`${users[i].username} Channel`),
        subscribers: getRandom(1000, 50000),
    })

    users[i].channels.push(channel._id)
    await users[i].save()

    channels.push(channel)
    console.log(`✅ Channel created: ${channel.channelName}`)
}

// ================= VIDEOS =================
console.log("\n🎬 Creating videos...")
const videos = []
let videoCounter = 1

for (let i = 0; i < youtubeVideos.length; i++) {
    const yt = youtubeVideos[i]
    const channel = channels[i % channels.length]

    const video = await Video.create({
        videoId: `vid_${videoCounter++}`,
        title: yt.title,
        videoUrl: `https://www.youtube.com/watch?v=${yt.id}`,
        thumbnailUrl: getThumbnailUrl(`https://www.youtube.com/watch?v=${yt.id}`),
        description: `Watch ${yt.title} — amazing content you will love!`,
        channelId: channel._id,
        uploader: channel.owner,
        views: getRandom(1000, 1000000),
        likes: getRandom(100, 50000),
        dislikes: getRandom(0, 5000),
        category: yt.category,
    })

    channel.videos.push(video._id)
    videos.push(video)
    console.log(`✅ Video created: ${yt.title}`)
}

for (const channel of channels) {
    await channel.save()
}

// ================= COMMENTS =================
console.log("\n💬 Creating comments...")
let commentCounter = 1

const commentTexts = [
    "Amazing video! Loved it 🔥",
    "Very helpful, thanks for sharing!",
    "This is exactly what I was looking for!",
    "Great content, keep it up!",
    "Subscribed! Can't wait for more videos.",
]

for (let video of videos) {
    for (let i = 0; i < 3; i++) {
        const randomUser = users[getRandom(0, users.length)]
        const randomText = commentTexts[getRandom(0, commentTexts.length)]

        const comment = await Comment.create({
            commentId: `com_${commentCounter++}`,
            videoId: video._id,
            userId: randomUser._id,
            text: randomText,
        })

        video.comments.push(comment._id)
    }

    await video.save()
}

// ================= DONE =================
console.log("\n" + "=".repeat(50))
console.log("✅ SEEDING COMPLETE!")
console.log("=".repeat(50))
console.log(`👥 Users created: ${users.length}`)
console.log(`📺 Channels created: ${channels.length}`)
console.log(`🎬 Videos created: ${videos.length}`)
console.log(`💬 Comments created: ${videoCounter * 3}`)
console.log("=".repeat(50))
console.log("\n🔑 Login credentials:")
console.log("   Email: tech@mail.com")
console.log("   Password: Password123")
console.log("=".repeat(50) + "\n")

await mongoose.connection.close()
console.log("🔌 DB connection closed")

process.exit()