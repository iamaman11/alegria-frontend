'use client'

import { cn } from '@/utilities/ui'
import React, { useEffect, useRef } from 'react'

import type { Props as MediaProps } from '../types'

import { getMediaUrl } from '@/utilities/getMediaUrl'

export const VideoMedia: React.FC<MediaProps> = (props) => {
  const { onClick, resource, videoClassName, alt } = props

  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleSuspend = () => {
      // Video playback suspended - could show fallback image here
      console.warn('Video playback suspended')
    }

    video.addEventListener('suspend', handleSuspend)

    return () => {
      video.removeEventListener('suspend', handleSuspend)
    }
  }, [])

  if (resource && typeof resource === 'object') {
    const { filename } = resource

    return (
      <video
        autoPlay
        className={cn(videoClassName)}
        controls={true}
        loop
        muted
        onClick={onClick}
        playsInline
        ref={videoRef}
        aria-label={alt || 'Video content'}
        title={alt}
      >
        <source src={getMediaUrl(`/media/${filename}`)} />
      </video>
    )
  }

  return null
}
