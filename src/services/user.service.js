import prisma from "../prisma/connect.prisma.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";
import cloudinary from "../common/cloudinary/init.cloudinary.js";
import { BadRequestException } from "../common/helpers/exception.helper.js";
import bcrypt from "bcryptjs";
import { validatePassword, validateEmail } from "../common/helpers/validate.helper.js";

const FOLDER_IMAGE = "public/images";
export const userService = {
    async getAllUsers(req) {
        // console.log("service findAll", req.payload);
        const { page, pageSize, where, index } = buildQueryPrisma(req.query);

        // prisma
        const resultPrismaPromise = prisma.user.findMany({
            where: where,
            skip: index, // skip tới vị trí index nào (OFFSET)
            take: pageSize, // take lấy bao nhiêu phần tử (LIMIT)
        });

        const totalItemPromise = prisma.user.count({
            where: where,
        });

        const [resultPrisma, totalItem] = await Promise.all([resultPrismaPromise, totalItemPromise]);

        // sequelize
        // const resultSequelize = await Article.findAll();

        return {
            page: page,
            pageSize: pageSize,
            totalItem: totalItem,
            totalPage: Math.ceil(totalItem / pageSize),
            items: resultPrisma,
        };
    },
    async avatarCloud(req) {
        // NEXT_PUBLIC_BASE_DOMAIN_CLOUDINARY=https://res.cloudinary.com/***********/image/upload/

        // req.file is the `avatar` file
        // req.body will hold the text fields, if there were any
        if (!req.file) {
            throw new BadRequestException("Không có file");
        }

        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    {
                        folder: FOLDER_IMAGE,
                    },
                    (error, uploadResult) => {
                        if (error) {
                            return reject(error);
                        }
                        return resolve(uploadResult);
                    }
                )
                .end(req.file.buffer);
        });

        // console.log(uploadResult);
        await prisma.user.update({
            where: {
                id: req.user.id,
            },
            data: {
                avatarCloudId: uploadResult.public_id,
            },
        });

        //   đảm bảo 1 user - 1 avatar
        if (req.user.avatarCloudId && req.user.avatarCloudId !== 'public/images/default_avatar') {
            console.log("deleted old avatar");
            cloudinary.uploader.destroy(req.user.avatarCloudId);
        }

        return true;
    },

    async createUsers(req) {
        const { fullName, email, password, phoneNumber, roleName } = req.body;
        
        // Validate email
        validateEmail(email);
        // Validate password
        validatePassword(password);
        
        // check email exists
        const userExist = await prisma.user.findUnique({
            where: { email: email }
        });
        if (userExist) {
            throw new BadRequestException("Email already exists");
        }

        // check role exists
        const role = await prisma.role.findUnique({
            where: { name: roleName }
        });
        if (!role) {
            throw new BadRequestException("Role does not exist");
        }

        // Hash Password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Create User
        return await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                phoneNumber,
                roleId: role.id,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
            include: { role: true }
        });
    }

};

