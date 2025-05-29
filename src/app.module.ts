import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { GqlAuthGuard } from 'src/auth/gql-auth.guard';
import { JwtAuthMiddleware } from 'src/auth/middleware/jwt-auth.middleware';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuthResolver } from './auth/auth.resolver';
import { AuthService } from './auth/auth.service';
import { CommonModule } from './common/common.module';
import { GraphQLErrorFilter } from './common/filters/graphql-exception.filter';
import { ContactsModule } from './contacts/contacts.module';
import { EmailModule } from './email/email.module';
import { JobApplicationModule } from './job-application/job-application.module';
import { JobSearchModule } from './job-search/job-search.module';
import { RedisModule } from './redis/redis.module';
import { TokenModule } from './token/token.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 200,
      },
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: ({ req, res }) => ({ req, res }),
      formatError: (error) => {
        const { extensions, ...rest } = error;
        return {
          ...rest,
          extensions: {
            ...extensions,
            stacktrace:
              process.env.NODE_ENV === 'development'
                ? extensions?.stacktrace
                : undefined,
          },
        };
      },
    }),
    AuthModule,
    CommonModule,
    ContactsModule,
    EmailModule,
    JobSearchModule,
    JobApplicationModule,
    PrismaModule,
    RedisModule,
    TokenModule,
    UserModule,
  ],
  providers: [
    AuthResolver,
    AuthService,
    {
      provide: APP_FILTER,
      useClass: GraphQLErrorFilter,
    },
    {
      provide: APP_GUARD,
      useClass: GqlAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtAuthMiddleware).forRoutes('*path'); // Apply to all routes
  }
}
