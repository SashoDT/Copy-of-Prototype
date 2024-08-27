import {MotifGraphNode, MotifGraphLink} from "./graph-dtos";

export class GraphDTO {
  nodes?: MotifGraphNode[];
  links?: MotifGraphLink[];
  lowerYear?: number;
  upperYear?: number;
}
