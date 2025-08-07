

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner"; 

// --- API Hooks ---
import {
  useLoadUserQuery,
  useUpdateUserInfoMutation,
  useUpdateUserAvatarMutation
} from '@/features/api/authApi';

// --- UI Components ---
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea"; 
import { Loader2, Pencil } from "lucide-react";

// --- Helper Component ---
const NavLink = ({ children, active = false, onClick }) => (
  <button
    onClick={onClick}
    className={`block w-full text-left px-4 py-2 text-sm rounded-md ${
      active
        ? 'bg-gray-200 dark:bg-gray-700 font-semibold text-gray-900 dark:text-white'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}
  >
    {children}
  </button>
);

// --- NEW: Configuration for social links ---
// To add a new link, just add a new object to this array.
const socialLinksConfig = [
    { key: 'facebook', label: 'facebook.com/', placeholder: 'your.username' },
    { key: 'instagram', label: 'instagram.com/', placeholder: 'your.username' },
    { key: 'twitter', label: 'twitter.com/', placeholder: 'your_handle' },
    { key: 'linkedin', label: 'linkedin.com/in/', placeholder: 'your-profile' }
];

// --- Main Profile Edit Component ---
const ProfileEdit = () => {
  const navigate = useNavigate();

  // --- State Management for Form Fields ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  
  // --- UPDATED: Unified state for all links ---
  const [links, setLinks] = useState({
    website: "",
    facebook: "",
    instagram: "",
    twitter: "",
    linkedin: ""
  });
  
  const [previewImage, setPreviewImage] = useState("");
  const fileInputRef = useRef(null);

  // --- API Hooks Instantiation ---
  const { data, isLoading: isUserLoading, isError, error } = useLoadUserQuery();
  const [updateUserInfo, { isLoading: isInfoUpdating }] = useUpdateUserInfoMutation();
  const [updateUserAvatar, { isLoading: isAvatarUpdating }] = useUpdateUserAvatarMutation();

  const user = data?.user;

  // --- Effect to Populate Form When User Data Loads ---
  useEffect(() => {
    if (user) {
      const [first = '', last = ''] = user.name?.split(' ') || [];
      setFirstName(first);
      setLastName(last);
      setHeadline(user.headline || "");
      setDescription(user.description || "");
      // --- UPDATED: Populate the links state object ---
      setLinks(prevLinks => ({
          ...prevLinks, // Ensures all keys exist
          ...(user.links || {}) // Overwrites with fetched data
      }));
      setPreviewImage(user.photoUrl || "");
    }
  }, [user]);

  // --- Handlers ---
  const handlePhotoChange = async (e) => {
    // ... (This function remains the same)
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewImage(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append('profilePhoto', file);
    try {
      await updateUserAvatar(formData).unwrap();
      toast.success("Avatar updated successfully!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update avatar.");
      setPreviewImage(user?.photoUrl || "");
    }
  };

  // --- NEW: Generic handler for all link inputs ---
  const handleLinkChange = (key, value) => {
    setLinks(prevLinks => ({
        ...prevLinks,
        [key]: value
    }));
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    
    // --- UPDATED: The links object is already in the correct format ---
    const updatedInfo = {
      name: `${firstName} ${lastName}`.trim(),
      headline,
      description,
      links, // Pass the links state object directly
    };

    try {
      await updateUserInfo(updatedInfo).unwrap();
      toast.success("Profile information saved!");
      navigate('/profile'); 
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save information.");
    }
  };

  // --- Render Logic ---
  if (isUserLoading) return <ProfileSkeleton />;
  if (isError) return <ProfileError error={error} />;

  return (
    <div className="bg-gray-50 dark:bg-black font-sans">
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          <aside className="w-full md:w-1/4 flex-shrink-0">
            {/* ... (Sidebar remains the same) ... */}
            <div className="flex flex-col items-center md:items-start space-y-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 text-3xl">
                  <AvatarImage src={previewImage} alt={user?.name} />
                  <AvatarFallback>{firstName?.[0]}{lastName?.[0]}</AvatarFallback>
                </Avatar>
                {isAvatarUpdating && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-full">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => !isAvatarUpdating && fileInputRef.current?.click()}
                  disabled={isAvatarUpdating}
                  className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Change profile photo"
                >
                  <Pencil className="w-8 h-8 text-white" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{`${firstName} ${lastName}`}</h2>
            </div>
            <nav className="mt-8 space-y-1">
              <NavLink onClick={() => navigate('/profile')}>View public profile</NavLink>
              <NavLink active>Profile</NavLink>
            </nav>
          </aside>

          <main className="w-full md:w-3/4 bg-white dark:bg-gray-900/50 p-8 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">Update your information here.</p>

              <form onSubmit={handleUpdateInfo} className="mt-8 space-y-8">
                {/* ... (Basics and Biography sections remain the same) ... */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Basics</h3>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" required />
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" required />
                  </div>
                  <div className="mt-4">
                    <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline (e.g., Full Stack Developer)" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Biography</h3>
                  <div className="mt-4">
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="5" placeholder="Tell us a bit about yourself..." />
                  </div>
                </div>

                {/* --- UPDATED: Links Section now uses .map() --- */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Links</h3>
                  <div className="mt-4 space-y-4">
                    <Input 
                        type="url" 
                        value={links.website} 
                        onChange={(e) => handleLinkChange('website', e.target.value)} 
                        placeholder="Website (https://your-site.com)" 
                    />
                    
                    {socialLinksConfig.map((link) => (
                      <div key={link.key} className="flex rounded-md shadow-sm">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 text-sm">
                          {link.label}
                        </span>
                        <Input 
                          value={links[link.key]} 
                          onChange={(e) => handleLinkChange(link.key, e.target.value)} 
                          placeholder={link.placeholder} 
                          className="rounded-l-none" 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                   <Button type="submit" disabled={isInfoUpdating || isAvatarUpdating}>
                    {isInfoUpdating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

// --- Helper Components for Loading and Error States (Unchanged) ---
const ProfileSkeleton = () => (
    // ... skeleton JSX
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row gap-8 animate-pulse">
          <aside className="w-full md:w-1/4">
              <div className="flex flex-col items-center md:items-start space-y-4">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <Skeleton className="h-6 w-40" />
              </div>
              <div className="mt-8 space-y-2">
                  {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
          </aside>
          <main className="w-full md:w-3/4 bg-white/50 dark:bg-gray-900/50 p-8 border border-gray-200 dark:border-gray-700 rounded-lg">
               <Skeleton className="h-8 w-48 mb-2" />
               <Skeleton className="h-4 w-64 mb-12" />
               <div className="space-y-8">
                   {[...Array(3)].map((_, i) => (
                       <div key={i}>
                           <Skeleton className="h-6 w-24 mb-4" />
                           <Skeleton className="h-10 w-full" />
                       </div>
                   ))}
               </div>
          </main>
      </div>
    </div>
  );

const ProfileError = ({ error }) => (
    // ... error JSX
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-black">
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-8 text-center">
      <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
        Failed to Load Profile
      </h2>
      <p className="text-red-600 dark:text-red-400 mb-6">
        {error?.data?.message || "An unexpected error occurred while loading your profile."}
      </p>
      <Button 
        variant="destructive"
        onClick={() => window.location.reload()}
      >
        Try Again
      </Button>
    </div>
  </div>
);

export default ProfileEdit;