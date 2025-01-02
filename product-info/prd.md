# Jellyfin Client Application PRD

## Overview
A minimal viable product (MVP) client application for streaming media content from a Jellyfin server. The application will focus on essential features for media consumption and user experience.

## Core Features

### Authentication
- Single user login/logout functionality using Jellyfin server credentials
- Basic user profile display showing username and avatar

### Library Browser
- Grid view of available media content showing thumbnails and titles
- Basic filtering by media type (Movies, TV Shows)
- Simple search functionality by title
- Display of basic metadata (year, duration, description)

### Video Playback
- Stream video content directly from Jellyfin server
- Basic video controls (play, pause, seek, volume)
- Track and save playback progress
- Resume from last played position

### Offline Viewing
- Download media for offline playback
- Simple download manager showing progress
- Access downloaded content through "Downloads" section
- Basic storage management (view storage used, delete downloads)

### Out of Scope for MVP
- Multiple user profiles
- Advanced search filters
- Parental controls
- Subtitle management
- Audio track selection
- Playback quality settings
- Content ratings/reviews
- Server configuration
- macOS support
- Picture-in-Picture (PiP) support

## Success Metrics
- Successful playback of content
- Accurate playback progress tracking
- Successful offline downloads
- Basic search functionality working
- Stable connection to Jellyfin server