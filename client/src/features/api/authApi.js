import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut } from "../authSlice"; // Your Redux auth slice actions
import { BASE_URL } from "@/app/constant";

// Define the base URL for all user-related API calls
const USER_API = `${BASE_URL}/api/v1/user/`;

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: USER_API,
    // Include credentials (like cookies) in all requests
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      // If you are using token-based auth (in addition to cookies), you could add it here
      // const token = getState().auth.token;
      // if (token) {
      //   headers.set('authorization', `Bearer ${token}`);
      // }
      return headers;
    },
  }),
  // Define tags for caching and invalidation, enabling automatic data refetching.
  tagTypes: ["User"],

  endpoints: (builder) => ({
    /**
     * @desc Registers a new user.
     * @method POST
     */
    registerUser: builder.mutation({
      query: (inputData) => ({
        url: "register",
        method: "POST",
        body: inputData,
      }),
    }),

    /**
     * @desc Logs in an existing user.
     * @method POST
     */
    loginUser: builder.mutation({
      query: (inputData) => ({
        url: "login",
        method: "POST",
        body: inputData,
      }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          // Upon successful login, dispatch the userLoggedIn action to update the auth state.
          dispatch(userLoggedIn({ user: result.data.user }));
        } catch (error) {
          console.error("Login failed:", error);
        }
      },
    }),

    /**
     * @desc Logs out the current user.
     * @method GET
     */
    logoutUser: builder.mutation({
      query: () => ({
        url: "logout",
        method: "GET",
      }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
          // Upon successful logout, dispatch the userLoggedOut action to clear the auth state.
          dispatch(userLoggedOut());
        } catch (error) {
          console.error("Logout failed:", error);
        }
      },
    }),

    /**
     * @desc Fetches the current logged-in user's profile data.
     * @method GET
     */
    loadUser: builder.query({
      query: () => "profile",
      // This query provides the 'User' tag. Any mutation that invalidates 'User'
      // will cause this query to automatically refetch.
      providesTags: ["User"],
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          dispatch(userLoggedIn({ user: result.data.user }));
        } catch (error) {
          // This can fail if no user is logged in, which is an expected scenario.
          console.log("No user session found or session expired.");
        }
      },
    }),

    /**
     * @desc Updates user's text-based information (name, headline, description, links).
     * @method PATCH
     */
    updateUserInfo: builder.mutation({
      query: (userInfo) => ({
        url: "profile/update-info",
        method: "PATCH",
        body: userInfo, // e.g., { name, headline, links: {...} }
      }),
      // When this mutation succeeds, invalidate the 'User' tag.
      // This forces the 'loadUser' query to refetch, updating the UI.
      invalidatesTags: ["User"],
    }),

    /**
     * @desc Updates user's profile picture.
     * @method PATCH
     */
    updateUserAvatar: builder.mutation({
      query: (formData) => ({
        url: "profile/update-avatar",
        method: "PATCH",
        body: formData, // This must be a FormData object from your component.
      }),
      // Invalidate the 'User' tag to show the new profile picture immediately.
      invalidatesTags: ["User"],
    }),

    /**
     * @desc Updates user's password.
     * @method PATCH
     */
    updateUserPassword: builder.mutation({
      query: (passwordData) => ({
        url: "profile/update-password",
        method: "PATCH",
        body: passwordData, // e.g., { currentPassword, newPassword }
      }),
      // No invalidation needed as it doesn't change visible data, but you could add it
      // if you wanted to trigger some UI feedback.
    }),

    /**
     * @desc Handles the final step of Google OAuth flow.
     * @method GET
     */
    googleLoginCallback: builder.mutation({
      query: () => ({
        // Note: The backend route is /api/auth/session-login but base is /api/v1/user
        // Adjust the URL to navigate correctly from the base.
        url: "../auth/session-login", // Example of adjusting path
        method: "GET",
      }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          dispatch(userLoggedIn({ user: result.data.user }));
        } catch (error) {
          console.error("Google session login failed:", error);
        }
      },
    }),
  }),
});

// Export the auto-generated hooks for use in your components.
// The old useUpdateUserMutation has been replaced by the specific hooks below.
export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useLogoutUserMutation,
  useLoadUserQuery,
  useUpdateUserInfoMutation,
  useUpdateUserAvatarMutation,
  useUpdateUserPasswordMutation,
  useGoogleLoginCallbackMutation, // Exported for completeness
} = authApi;