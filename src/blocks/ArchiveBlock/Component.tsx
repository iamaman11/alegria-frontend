import type { Post, ArchiveBlock as ArchiveBlockProps } from '@/payload-types'

import { getAllPosts, getPostsByCategory } from '@/lib/api'
import React from 'react'
import RichText from '@/components/RichText'

import { CollectionArchive } from '@/components/CollectionArchive'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
  }
> = async (props) => {
  const { id, categories, introContent, limit: limitFromProps, populateBy, selectedDocs } = props

  const limit = limitFromProps || 3

  let posts: Post[] = []

  if (populateBy === 'collection') {
    const flattenedCategories = categories?.map((category) => {
      if (typeof category === 'object') return category.id
      else return category
    })

    if (flattenedCategories && flattenedCategories.length > 0) {
      // Fetch posts by first category (API limitation - can extend to support multiple)
      const categoryId = flattenedCategories[0]
      const fetchedPosts = await getPostsByCategory(categoryId as string, 1, limit)
      posts = fetchedPosts.docs
    } else {
      // Fetch all posts
      const fetchedPosts = await getAllPosts(1, limit)
      posts = fetchedPosts.docs
    }
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === 'object') return post.value
      }) as Post[]

      posts = filteredSelectedPosts
    }
  }

  return (
    <div className="my-16" id={`block-${id}`}>
      {introContent && (
        <div className="container mb-16">
          <RichText className="ms-0 max-w-[48rem]" data={introContent} enableGutter={false} />
        </div>
      )}
      <CollectionArchive posts={posts} />
    </div>
  )
}
