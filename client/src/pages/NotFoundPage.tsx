import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Film, Tv, Search } from 'lucide-react';
import { Button } from '@/components/ui';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-[128px]"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Floating film icons */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-white/5"
            style={{
              top: `${15 + (i * 15)}%`,
              left: `${10 + (i * 15)}%`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 10, 0],
              opacity: [0.03, 0.08, 0.03],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          >
            {i % 2 === 0 ? (
              <Film className="w-16 h-16 md:w-24 md:h-24" />
            ) : (
              <Tv className="w-16 h-16 md:w-24 md:h-24" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* 404 Number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="mb-8"
        >
          <h1 className="text-[150px] md:text-[200px] font-bold leading-none bg-gradient-to-b from-primary via-primary/80 to-primary/20 bg-clip-text text-transparent select-none">
            404
          </h1>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Lost in the Stream
          </h2>
          <p className="text-text-secondary text-lg md:text-xl mb-8 max-w-md mx-auto">
            Looks like this page took an unexpected plot twist. 
            The content you're looking for doesn't exist or has been moved.
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/">
            <Button size="lg" className="gap-2 min-w-[180px]">
              <Home className="w-5 h-5" />
              Back to Home
            </Button>
          </Link>
          <Link to="/search">
            <Button variant="outline" size="lg" className="gap-2 min-w-[180px]">
              <Search className="w-5 h-5" />
              Search Content
            </Button>
          </Link>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 pt-8 border-t border-surface"
        >
          <p className="text-text-muted text-sm mb-4">Or explore our popular sections:</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              to="/movies" 
              className="flex items-center gap-2 px-4 py-2 bg-surface/50 hover:bg-surface rounded-full text-text-secondary hover:text-white transition-colors"
            >
              <Film className="w-4 h-4" />
              Movies
            </Link>
            <Link 
              to="/tv" 
              className="flex items-center gap-2 px-4 py-2 bg-surface/50 hover:bg-surface rounded-full text-text-secondary hover:text-white transition-colors"
            >
              <Tv className="w-4 h-4" />
              TV Shows
            </Link>
            <Link 
              to="/my-list" 
              className="flex items-center gap-2 px-4 py-2 bg-surface/50 hover:bg-surface rounded-full text-text-secondary hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              My List
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFoundPage;
