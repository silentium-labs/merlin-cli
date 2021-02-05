import { singular } from "pluralize";
import {
  Arg,
  ClassType,
  Ctx,
  ID,
  Info,
  Mutation,
  PubSub,
  PubSubEngine,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";
import { getManager } from "typeorm";
import { IGqlContext } from "../../context";
import { BaseModel } from "../../database/base.model";
import { GraphQLInfo } from "../../gql/utils";
import { AbstractSecureResolver } from "../models/abstract-secure-resolver";
import { getTypeormEntityFromSubclass } from "../utils/typeorm";
import { EntityToGraphResolver } from "./entity-resolver";

export abstract class AbstractDeleteResolver<T> extends AbstractSecureResolver {
  async delete(
    id: number,
    pubSub: PubSubEngine,
    info: GraphQLInfo,
    context: IGqlContext
  ): Promise<T> {
    throw "Not implemented";
  }

  async notifyDelete(
    payload: T,
    info: GraphQLInfo,
    context: IGqlContext
  ): Promise<T> {
    throw "Not implemented";
  }
}

export function DeleteResolver<T extends ClassType>(
  baseModelType: typeof BaseModel
): typeof AbstractDeleteResolver {
  const baseModelSingularName = singular(
    baseModelType.name[0].toLowerCase() + baseModelType.name.slice(1)
  );

  @Resolver({ isAbstract: true })
  abstract class DeleteResolver<
    T,
    BaseFilterFields,
    BaseSortFields
  > extends AbstractDeleteResolver<T> {
    @Mutation((returns) => baseModelType, {
      name: `${baseModelSingularName}Delete`,
    })
    async delete(
      @Arg("id", (type) => ID) id: number,
      @PubSub() pubSub: PubSubEngine,
      @Info() info: GraphQLInfo,
      @Ctx() context: IGqlContext
    ): Promise<T> {
      this.checkSecurity(context);
      const idDatabaseName = baseModelType.getIdDatabaseName();
      //lets save the object in memory to notify the pubsub once it gets deleted
      const toDelete = <T>(
        await getManager()
          .getRepository(baseModelType)
          .createQueryBuilder("e")
          .where(`e.${idDatabaseName} = :id`, { id })
          .getOne()
      );
      if (!toDelete) {
        throw "No entity for such id";
      }
      const toReturn = await EntityToGraphResolver.find<T>(
        id,
        baseModelType,
        info
      );

      if (!toReturn) {
        throw "No entity for such id";
      }

      //Try soft delete, if not possible then bye bye record
      try {
        await getManager().getRepository(baseModelType).softRemove(toDelete);
      } catch (ex) {
        if (ex.name === "MissingDeleteDateColumnError") {
          // Database Delete
          await getManager().getRepository(baseModelType).delete(toDelete);
        }
      }
      await pubSub.publish(`${baseModelSingularName}Delete`, toDelete);
      return toReturn;
    }

    @Subscription((returns) => baseModelType, {
      topics: `${baseModelSingularName}Delete`,
      name: `${baseModelSingularName}Delete`,
    })
    async notifyDelete(
      @Root() payload: T,
      @Info() info: GraphQLInfo,
      @Ctx() context: IGqlContext
    ): Promise<T> {
      this.checkSecurity(context);
      //const idProp = baseModelType.getIdPropertyName();
      //const idValue = (payload as { [key: string]: any })[idProp];
      return payload;
    }
  }

  return DeleteResolver;
}
