import {
  toEntityOTFileName,
  toFileName,
  toGraphQLModelRelation,
  toInputsName,
  toLocalOTImport,
} from "./../generation/model-generation";
import { Column } from "../models/column";
import { Relation } from "../models/relation";
import IGenerationOptions from "../options/generation-options.interface";
import {
  defaultExport,
  printPropertyVisibility,
  strictMode,
  toEntityDirectoryName,
  toEntityFileName,
  toEntityName,
  toInputsCreateName,
  toInputsUpdateName,
  toJson,
  toLocalImport,
  toPropertyName,
  toRelation,
  toFiltersName,
  toSortsName,
  toGraphQLFilterRelation,
} from "../generation/model-generation";
import { Entity } from "../models/entity";

const defaultFieldType = (tscType: string) => {
  if (tscType === "string") {
    return "String";
  } else if (tscType === "number") {
    return "Float";
  } else if (tscType === "Date") {
    return "Date";
  } else if (tscType === "boolean") {
    return "Boolean";
  }
};

// prettier-ignore
const ImportsTemplate = (fileImport: string, generationOptions: IGenerationOptions) => {
    return `import ${toLocalImport(toEntityName(fileImport, generationOptions), generationOptions)} from "../${toEntityDirectoryName(fileImport, generationOptions)}/${toEntityFileName(fileImport, generationOptions)}";`;
};

// prettier-ignore
const ColumnTemplate = (
  entity: Entity,
  column: Column,
  generationOptions: IGenerationOptions
) => {
  const propertyName = toPropertyName(column.tscName, generationOptions);
  const fieldType = column.generated ?
    `@MerlinGQLField((type) => ID ${column.options.nullable ? ",{ nullable: true }" : ""})` :
    `@MerlinGQLField((type)=> ${defaultFieldType(column.tscType)} ${column.options.nullable ? ",{ nullable: true }" : ""})`;

  return `
    ${fieldType}
    ${propertyName}!:${column.tscType};
  `;
};

// prettier-ignore
const RelationTemplate = (
  entity: Entity,
  relation: Relation,
  generationOptions: IGenerationOptions
  ) => {
    const relatedTableEntityName = toEntityName(relation.relatedTable, generationOptions);
    const propertyName = `${toPropertyName(relation.fieldName, generationOptions)}?:${toRelation(relatedTableEntityName, relation.relationType, generationOptions)};`
    return `
    @MerlinGQLField((type) =>  ${toGraphQLModelRelation(relatedTableEntityName, relation.relationType)}, { nullable: true })
    ${propertyName}
    `;
  };

// prettier-ignore
export const ObjectTypeTemplate = (
    entity: Entity,
    generationOptions: IGenerationOptions
): string => {
  const entityName:string = toEntityName(entity.tscName, generationOptions);
  const fileName:string = toFileName(entity.tscName, generationOptions)
  const inputsCreateName:string = toInputsCreateName(entity.tscName, generationOptions);
  const inputUpdateName:string = toInputsUpdateName(entity.tscName, generationOptions);
  const sortName:string = toSortsName(entity.tscName, generationOptions);
  const filterName:string = toFiltersName(entity.tscName, generationOptions);

  return `
        import { MerlinGQLField, MerlinGQLResolver } from "merlin-gql";
        import { Int, Float, ID } from "type-graphql";
        import { ${entityName} } from "./${toEntityFileName(entityName, generationOptions)}";

        ${entity.fileImports.map(fileImport => ImportsTemplate(fileImport, generationOptions)).join("\n")}

        @MerlinGQLResolver(["FIND", "LIST", "CREATE", "UPDATE", "DELETE"])
        export ${defaultExport(generationOptions)} class ${entityName}OT extends ${entityName} {

          ${entity.columns.map(c => ColumnTemplate(entity, c, generationOptions)).join("\n")}

          ${entity.relations.map(r => RelationTemplate(entity, r, generationOptions)).join("\n")}
        }
      `
  }
