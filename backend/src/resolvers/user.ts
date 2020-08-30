import {
  Resolver,
  Mutation,
  Arg,
  InputType,
  Field,
  Ctx,
  ObjectType,
  Query,
} from "type-graphql";
import { MyContext } from "src/types";
import { User } from "../entities/User";
import argon2 from "argon2";

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field()
  status: string;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext) {
    /** Chec session if not login */
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const { username, password } = options;
    if (username.length <= 2) {
      return {
        status: "error",
        errors: [
          {
            field: "username",
            message: "length must be greater than 2",
          },
        ],
      };
    }

    if (password.length <= 7) {
      return {
        status: "error",
        errors: [
          {
            field: "password",
            message: "the password min 8 character",
          },
        ],
      };
    }

    const hashPassword = await argon2.hash(password);
    const user = em.create(User, {
      username: username,
      password: hashPassword,
    });

    try {
      await em.persistAndFlush(user);
    } catch (err) {
      /** Check duplicate value */
      if (err.code === "23505" || err.detail.includes("already exists")) {
        return {
          status: "error",
          errors: [
            {
              field: "username",
              message: "the username already exist",
            },
          ],
        };
      }
    }

    /** Store user to cookie session
     *
     * store user id session
     * this will set a cookie on the user
     * keep them logged in
     */
    req.session.userId = user.id;

    return {
      status: "success",
      user,
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const { username, password } = options;
    const user = await em.findOne(User, { username: username });
    if (!user) {
      return {
        status: "error",
        errors: [
          {
            field: "username",
            message: "that username doesn't exist",
          },
        ],
      };
    }

    const isPasswordValid = await argon2.verify(user.password, password);

    if (!isPasswordValid) {
      return {
        status: "error",
        errors: [
          {
            field: "password",
            message: "incorrect password",
          },
        ],
      };
    }

    /** Save session with user id */
    req.session.userId = user.id;

    return {
      status: "success",
      user,
    };
  }
}
