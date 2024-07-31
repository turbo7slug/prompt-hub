import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import User from '@models/user';
import { connectToDB } from '@utils/database';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async session({ session }) {
      // store the user id from MongoDB to session
      const sessionUser = await User.findOne({ email: session.user.email });
      session.user.id = sessionUser._id.toString();

      return session;
    },
    async signIn({ account, profile, user, credentials }) {
      try {
        await connectToDB();

        // check if user already exists
        const userExists = await User.findOne({ email: profile.email });

        if (!userExists) {
          // generate a valid username from the profile name
          let username = profile.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

          // ensure the username is between 8 and 20 characters
          if (username.length < 8) {
            username = username.padEnd(8, '0');
          } else if (username.length > 20) {
            username = username.slice(0, 20);
          }

          // ensure the username matches the regex
          const usernameRegex = /^(?=.{8,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/;
          if (!usernameRegex.test(username)) {
            throw new Error("Generated username does not meet the requirements");
          }

          await User.create({
            email: profile.email,
            username,
            image: profile.picture,
          });
        }

        return true;
      } catch (error) {
        console.log("Error checking if user exists: ", error.message);
        return false;
      }
    },
  }
});

export { handler as GET, handler as POST };
