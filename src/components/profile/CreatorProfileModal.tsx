import React, { useState } from 'react';
import { CreatorProfile } from '../../types';
import { X, MapPin, Send, Edit3, Check, Sparkles, Camera } from 'lucide-react';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';
import { ImageUploader } from '../common/ImageUploader';
import { frantosDB } from '../../services/supabaseClient';

interface CreatorProfileModalProps {
  profile: CreatorProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProfile?: (updated: CreatorProfile) => void;
}

export const CreatorProfileModal: React.FC<CreatorProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onUpdateProfile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [handle, setHandle] = useState(profile.handle);
  const [location, setLocation] = useState(profile.location);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [coverImage, setCoverImage] = useState(profile.coverImage);
  const [availability, setAvailability] = useState(profile.availability);
  const [showCoverUpload, setShowCoverUpload] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CreatorProfile = {
      ...profile,
      name: name.trim() || profile.name,
      role: role.trim() || profile.role,
      handle: handle.trim() || profile.handle,
      location: location.trim() || profile.location,
      bio: bio.trim() || profile.bio,
      avatar: avatar || profile.avatar,
      coverImage: coverImage || profile.coverImage,
      availability,
    };

    frantosDB.saveProfileOverride(updated);
    if (onUpdateProfile) {
      onUpdateProfile(updated);
    }
    setIsEditing(false);
    setShowCoverUpload(false);
    setShowAvatarUpload(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div 
      id="creator-profile-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden bg-white dark:bg-[#0D0F15] border border-black/10 dark:border-white/15 text-[#111317] dark:text-white shadow-2xl my-auto max-h-[90vh] overflow-y-auto frantos-animated-frame"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Banner */}
        <div className="relative h-44 sm:h-52 bg-zinc-900 overflow-hidden group">
          <img
            src={coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0D0F15] via-black/30 to-transparent" />
          
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-cyan-300 backdrop-blur-md transition-transform cursor-pointer"
              title="Edit Profile"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-transform cursor-pointer"
              aria-label="Close profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={() => setShowCoverUpload(!showCoverUpload)}
              className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs font-mono backdrop-blur-md border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Cover Image</span>
            </button>
          )}
        </div>

        {/* Profile Details Container */}
        <div className="p-6 sm:p-8 -mt-16 relative z-10 space-y-6">
          
          {/* Cover image uploader dropdown if toggled */}
          {isEditing && showCoverUpload && (
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
              <ImageUploader
                initialImageUrl={coverImage}
                onImageUploaded={({ url }) => {
                  setCoverImage(url);
                  setShowCoverUpload(false);
                }}
                label="Upload Profile Banner Image"
                aspectRatio="wide"
                showAltInput={false}
              />
            </div>
          )}

          {/* Avatar & Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="relative group">
                <img
                  src={avatar}
                  alt={name}
                  className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white dark:ring-[#0D0F15] shadow-2xl"
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setShowAvatarUpload(!showAvatarUpload)}
                    className="absolute inset-0 rounded-3xl bg-black/60 flex flex-col items-center justify-center text-white text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-4 h-4 mb-1" />
                    <span>Upload</span>
                  </button>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-display font-extrabold tracking-tight text-[#111317] dark:text-white">
                  {name}
                </h3>
                <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{handle}</p>
                <div className="flex items-center gap-1.5 text-xs text-[#4A505C] dark:text-zinc-400 mt-0.5 font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{location}</span>
                </div>
              </div>
            </div>

            {/* Availability Status Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{availability}</span>
            </div>
          </div>

          {/* Avatar uploader dropdown if toggled */}
          {isEditing && showAvatarUpload && (
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
              <ImageUploader
                initialImageUrl={avatar}
                onImageUploaded={({ url }) => {
                  setAvatar(url);
                  setShowAvatarUpload(false);
                }}
                label="Upload Creator Avatar"
                aspectRatio="square"
                showAltInput={false}
              />
            </div>
          )}

          {/* Edit Form Body if in editing mode */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1">Handle</label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1">Studio Role</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1">Artist Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Bio */}
              <p className="text-sm text-[#4A505C] dark:text-zinc-300 leading-relaxed font-sans">
                {bio}
              </p>

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-2 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
                <div>
                  <div className="text-lg font-display font-bold text-[#111317] dark:text-white">{profile.stats.exhibitsCount}</div>
                  <div className="text-[10px] font-mono text-[#4A505C] dark:text-zinc-400 uppercase font-semibold">Exhibits</div>
                </div>
                <div>
                  <div className="text-lg font-display font-bold text-cyan-600 dark:text-cyan-400">{profile.stats.savesCount}</div>
                  <div className="text-[10px] font-mono text-[#4A505C] dark:text-zinc-400 uppercase font-semibold">Saves</div>
                </div>
                <div>
                  <div className="text-lg font-display font-bold text-[#111317] dark:text-white">{profile.stats.collabsCount}</div>
                  <div className="text-[10px] font-mono text-[#4A505C] dark:text-zinc-400 uppercase font-semibold">Collabs</div>
                </div>
                <div>
                  <div className="text-lg font-display font-bold text-amber-600 dark:text-amber-400">{profile.stats.awardsCount}</div>
                  <div className="text-[10px] font-mono text-[#4A505C] dark:text-zinc-400 uppercase font-semibold">Awards</div>
                </div>
              </div>

              {/* Disciplines & Tools Stack */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-widest text-[#4A505C] dark:text-zinc-400 mb-2 font-bold">
                    Active Studio Disciplines
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.disciplines.map((d) => {
                      const match = CREATIVE_DISCIPLINES.find((cd) => cd.id === d);
                      return (
                        <span
                          key={d}
                          className="px-3 py-1 rounded-full text-xs font-mono border font-medium"
                          style={{
                            backgroundColor: `${match?.color}22`,
                            borderColor: `${match?.color}55`,
                            color: match?.color,
                          }}
                        >
                          {match?.label || d}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-mono uppercase tracking-widest text-[#4A505C] dark:text-zinc-400 mb-2 font-bold">
                    Software & Engine Stack
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.tools.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono text-zinc-800 dark:text-zinc-300 font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Collaboration Notification */}
          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Profile updated and preserved in Demo local storage!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
