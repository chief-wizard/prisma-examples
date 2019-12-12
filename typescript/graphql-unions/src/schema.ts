import { nexusPrismaPlugin } from 'nexus-prisma'
import { idArg, makeSchema, objectType, stringArg } from 'nexus'

const User = objectType({
  name: 'User',
  definition(t) {
    t.model.id()
    t.model.name()
    t.model.email()
    t.model.posts({
      pagination: false,
    })
  },
})

const Article = objectType({
  name: 'Article',
  definition(t) {
    t.model.id()
    t.model.createdAt()
    t.model.updatedAt()
    t.model.title()
    t.model.content()
    t.model.published()
    t.model.author()
  },
})

const Photo = objectType({
  name: 'Photo',
  definition(t) {
    t.model.id()
    t.model.createdAt()
    t.model.description()
    t.model.author()
  },
})

const Post = objectType({
  name: 'Post',
  definition(t) {
    t.members('Article', 'Photo')
    t.resolveType((item) => item.name)
  },
})

const Query = objectType({
  name: 'Query',
  definition(t) {
    t.crud.article({
      alias: 'article',
    })

    t.crud.photo({
      alias: 'photo',
    })

    t.list.field('feed', {
      type: 'Post',
      resolve: (_parent, _args, ctx) => {
        return ctx.photon.article.findMany({
            where: { published: true },
          }).concat(
          ctx.photon.photo.findMany()).sort(
            function(a,b){
              a.createdAt()-b.createdAt()
            })
      },
    })

    t.list.field('filterPosts', {
      type: 'Post',
      args: {
        searchString: stringArg({ nullable: true }),
      },
      resolve: (_, { searchString }, ctx) => {
        return ctx.photon.articles.findMany({
          where: {
            OR: [
              { title: { contains: searchString } },
              { content: { contains: searchString } },
            ],
          },
        }).concat(
          ctx.photon.articles.findMany({
            where: { description: { contains: searchString } },
        })).sort(
            function(a,b){
              a.createdAt()-b.createdAt()
            })
      },
    })
  },
})

const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    t.crud.createOneUser({ alias: 'signupUser' })
    t.crud.deleteOneArticle()
    t.crud.deleteOneImage()

    t.field('uploadPhoto', {
      type: 'Photo',
      args: {
        description: stringArg({ nullable: false }),
        authorEmail: stringArg(),
      },
      resolve: (_, { description, authorEmail }, ctx) => {
        return ctx.photon.photos.create({
          data: {
            description,
            author: {
              connect: { email: authorEmail },
            },
          },
        })
      },
    })

    t.field('createDraft', {
      type: 'Article',
      args: {
        title: stringArg({ nullable: false }),
        content: stringArg(),
        authorEmail: stringArg(),
      },
      resolve: (_, { title, content, authorEmail }, ctx) => {
        return ctx.photon.articles.create({
          data: {
            title,
            content,
            published: false,
            author: {
              connect: { email: authorEmail },
            },
          },
        })
      },
    })

    t.field('publish', {
      type: 'Article',
      nullable: true,
      args: {
        id: idArg(),
      },
      resolve: (_, { id }, ctx) => {
        return ctx.photon.article.update({
          where: { id },
          data: { published: true },
        })
      },
    })
  },
})

export const schema = makeSchema({
  types: [Query, Mutation, Post, Article, Photo, User],
  plugins: [nexusPrismaPlugin()],
  outputs: {
    schema: __dirname + '/generated/schema.graphql',
    typegen: __dirname + '/generated/nexus.ts',
  },
  typegenAutoConfig: {
    contextType: 'Context.Context',
    sources: [
      {
        source: '@prisma/photon',
        alias: 'photon',
      },
      {
        source: require.resolve('./context'),
        alias: 'Context',
      },
    ],
  },
})
