import React, { useEffect, useState, useRef } from "react";
import { Menu, School, Home, BookOpen, GraduationCap, HelpCircle, User, LogOut, Search, Heart, ShoppingCart, Bell, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"; // Ensure you have this from shadcn/ui
import { Button } from "./ui/button"; // Ensure you have this from shadcn/ui
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"; // Ensure you have this from shadcn/ui
import DarkMode from "@/DarkMode"; // Your DarkMode component
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet"; // Ensure you have this from shadcn/ui
import { Link, useNavigate } from "react-router-dom";
import { useLogoutUserMutation } from "@/features/api/authApi"; // Your RTK Query hook
import { toast } from "sonner"; // Your notification library
import { useSelector } from "react-redux";

// UserAvatar component (remains unchanged and self-contained)
const UserAvatar = ({ user, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const getInitials = (name) => {
    if (!name) return 'A'; const names = name.split(' ');
    if (names.length === 1) return name.substring(0, 2).toUpperCase();
    if (names.length > 1 && names[0] && names[1]) { return `${names[0][0]}${names[1][0]}`.toUpperCase(); }
    return name.substring(0, 2).toUpperCase();
  };
  return (
    <div className="relative">
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild><button className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-full font-bold text-sm relative"><Avatar className="h-10 w-10"><AvatarImage src={user?.photoUrl} alt={user?.name} /><AvatarFallback>{getInitials(user?.name)}</AvatarFallback></Avatar><span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-purple-600 border-2 border-white"></span></button></DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end" forceMount><DropdownMenuLabel className="font-normal"><div className="flex flex-col space-y-1"><p className="text-sm font-medium leading-none">{user.name}</p><p className="text-xs leading-none text-muted-foreground">{user.email}</p></div></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link to="/profile" className="w-full flex items-center gap-2 cursor-pointer">Profile</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/my-learning" className="w-full flex items-center gap-2 cursor-pointer">My Learning</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => { onLogout(); setDropdownOpen(false); }} className="w-full text-left flex items-center gap-2 text-red-600 cursor-pointer"><LogOut size={14} />Logout</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};


const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const [logoutUser, { data, isSuccess }] = useLogoutUserMutation();
  const navigate = useNavigate();

  // --- STATE FOR LIVE API SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState({ suggestions: [], courses: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const searchContainerRef = useRef(null);

  // --- EFFECT FOR DEBOUNCED API FETCHING ---
  useEffect(() => {
    // If the query is empty, clear everything and hide the dropdown
    if (searchQuery.trim() === '') {
      setResults({ suggestions: [], courses: [] });
      setIsDropdownVisible(false);
      return;
    }

    // Set a timer to fetch data 300ms after the user stops typing
    const timerId = setTimeout(() => {
      const fetchSearchResults = async () => {
        setIsLoading(true);
        setIsDropdownVisible(true);
        try {
          // ---!!! IMPORTANT: REPLACE WITH YOUR BACKEND URL !!!---
          const response = await fetch(`http://localhost:8080/api/v1/search?q=${encodeURIComponent(searchQuery)}`);
          
          if (!response.ok) {
            throw new Error('Search request failed');
          }
          
          const data = await response.json();
          // The backend sends back an object: { suggestions: [...], courses: [...] }
          setResults(data);
        } catch (error) {
          console.error("Failed to fetch search results:", error);
          setResults({ suggestions: [], courses: [] }); // Clear results on error
        } finally {
          setIsLoading(false);
        }
      };

      fetchSearchResults();
    }, 300); // 300ms debounce delay

    // Cleanup function: If the user types again, cancel the previous timer
    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]); // This effect re-runs only when `searchQuery` changes

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Navigates to a general search page when a term is clicked
  const handleSuggestionClick = (suggestion) => {
    navigate(`/course/search?query=${encodeURIComponent(suggestion)}`);
    setIsDropdownVisible(false);
  };
  
  // Handles form submission by pressing Enter
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() !== "") {
      navigate(`/course/search?query=${encodeURIComponent(searchQuery)}`);
      setIsDropdownVisible(false);
    }
  };

  // Effect to close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsDropdownVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Other component logic (logout, nav links, auth buttons)
  const logoutHandler = async () => await logoutUser();
  useEffect(() => { if (isSuccess) { toast.success(data?.message || "Logged out successfully"); navigate("/login"); } }, [isSuccess, data, navigate]);
  const NavLink = ({ to, children }) => (<Link to={to} className="text-sm text-gray-700 hover:text-purple-600 transition-colors">{children}</Link>);
  const IconButton = ({ to, icon, ariaLabel }) => (<Link to={to} className="text-2xl text-gray-700 hover:text-purple-600" aria-label={ariaLabel}>{icon}</Link>);
  
  const renderAuthSection = () => {
    if (user) {
      return (<div className="flex items-center gap-4"><IconButton to="/wishlist" icon={<Heart />} ariaLabel="My Wishlist" /><IconButton to="/cart" icon={<ShoppingCart />} ariaLabel="Shopping Cart" /><IconButton to="/notifications" icon={<Bell />} ariaLabel="Notifications" /><UserAvatar user={user} onLogout={logoutHandler} /></div>);
    }
    return (<div className="flex items-center gap-2"><Button variant="outline" onClick={() => navigate('/login')}>Log in</Button><Button onClick={() => navigate('/register')}>Sign up</Button></div>);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center gap-4">
        <div className="flex items-center gap-4 shrink-0"><Link to="/"><img src="/samriddhi_logo1.png" alt="Samriddhi Logo" width="82" height="34" /></Link><div className="hidden lg:block"><NavLink to="/course/search">Explore</NavLink></div></div>
        
        <div ref={searchContainerRef} className="flex-grow hidden sm:block mx-4 relative">
          <form onSubmit={handleSearchSubmit}>
            <Search className="absolute top-1/2 left-4 transform -translate-y-1/2 text-gray-500 z-10" />
            <input 
              type="text" 
              placeholder="Search for anything..." 
              className="relative w-full h-12 border border-black rounded-full pl-12 pr-4 text-sm text-black focus:outline-none focus:ring-1 focus:ring-black"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => setIsDropdownVisible(searchQuery.trim() !== "")}
              autoComplete="off"
            />
          </form>

          {isDropdownVisible && (
            <div className="absolute top-full w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-[70vh] overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : (
                <>
                  {/* Show message only if loading is false and there are no results */}
                  {!isLoading && results.suggestions.length === 0 && results.courses.length === 0 && (
                     <div className="p-4 text-sm text-center text-gray-500">No results found for "{searchQuery}"</div>
                  )}

                  {/* Section 1: Search Term Suggestions */}
                  {results.suggestions.length > 0 && (
                    <ul className="py-1">
                      {results.suggestions.map((suggestion) => (
                        <li key={suggestion}>
                          <button onClick={() => handleSuggestionClick(suggestion)} className="w-full flex items-center gap-4 px-3 py-3 text-base font-bold text-gray-800 hover:bg-gray-100 rounded-md">
                            <Search size={20}/>
                            <span>{suggestion}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {results.suggestions.length > 0 && results.courses.length > 0 && <hr className="my-2"/>}

                  {/* Section 2: Course Results */}
                  {results.courses.length > 0 && (
                    <div>
                      <h3 className="px-3 py-1 text-xs font-bold text-gray-500 uppercase">Courses</h3>
                      <ul>
                        {results.courses.map((course) => (
                          <li key={course._id}>
                            <Link 
                              to={`/course/${course._id}`} // Using _id from backend
                              className="flex items-center gap-3 p-2 rounded-md text-gray-800 hover:bg-gray-100"
                              onClick={() => setIsDropdownVisible(false)}
                            >
                              <img src={course.thumbnail} alt={course.title} className="w-11 h-11 object-cover bg-gray-200"/>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm leading-tight">{course.title}</span>
                                <span className="text-xs text-gray-500">{course.creatorName}</span>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="hidden md:flex items-center gap-6"><div className="hidden lg:flex items-center gap-6"><NavLink to="/about">About</NavLink><NavLink to="/how-it-works">How It Works</NavLink><NavLink to="/contact">Contact</NavLink><NavLink to="/blog">Blog</NavLink>{user?.role === 'instructor' && (<NavLink to="/admin/dashboard">Instructor</NavLink>)}</div><div className="h-10 min-w-[220px] flex items-center justify-end">{renderAuthSection()}</div></div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden focus:outline-none text-2xl" aria-label="Toggle menu">{mobileMenuOpen ? '✕' : <Menu />}</button>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="flex flex-col">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                <School size={24} className="text-blue-600" />
                <span className="font-bold text-lg">Samriddhi Gyan</span>
              </Link>
            </SheetTitle>
            <DarkMode />
          </SheetHeader>
          
          <div className="py-4">
             <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full h-10 border border-gray-300 rounded-full pl-10 pr-4 text-sm"
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
          </div>

          <nav className="grid gap-4">
            <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium hover:bg-gray-100" onClick={() => setMobileMenuOpen(false)}><Home size={16} /> Home</Link>
            <Link to="/course/search" className="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium hover:bg-gray-100" onClick={() => setMobileMenuOpen(false)}><BookOpen size={16} /> Courses</Link>
            {user && (
              <>
                <Link to="/my-learning" className="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium hover:bg-gray-100" onClick={() => setMobileMenuOpen(false)}><BookOpen size={16} /> My Learning</Link>
                <Link to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium hover:bg-gray-100" onClick={() => setMobileMenuOpen(false)}><User size={16} /> Profile</Link>
              </>
            )}
            {user?.role === 'instructor' && (
              <Link to="/admin/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium hover:bg-gray-100" onClick={() => setMobileMenuOpen(false)}><GraduationCap size={16} /> Instructor Dashboard</Link>
            )}
          </nav>
          
          <div className="mt-auto">
            {user ? (
              <Button variant="destructive" onClick={() => { logoutHandler(); setMobileMenuOpen(false); }} className="w-full gap-2"><LogOut size={16} /> Logout</Button>
            ) : (
              <div className="grid gap-2 w-full">
                <Button onClick={() => { navigate("/login"); setMobileMenuOpen(false); }} className="w-full">Login</Button>
                <Button variant="outline" onClick={() => { navigate("/register"); setMobileMenuOpen(false); }} className="w-full">Sign Up</Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Navbar;