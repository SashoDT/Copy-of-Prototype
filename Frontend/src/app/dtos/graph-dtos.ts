import {SimulationLinkDatum} from "d3";


export interface MotifGraphLink {
  source: MotifGraphNode;
  target: MotifGraphNode;
  type: 'ACTED_IN' | 'PRODUCED' | 'DIRECTED' | 'WROTE' | 'REVIEWED';
}

export interface MotifGraphNode {
  id: string;
  type: 'Person' | 'Movie';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphNode {
  id: string;
  x?: number;
  y?: number;
  type: 'Person' | 'Movie';
  properties: {
    born?: number;
    name?: string;
    [key: string]: any; // To allow for additional properties
  };
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'ACTED_IN' | 'PRODUCED' | 'DIRECTED' | 'WROTE' | 'REVIEWED';
  properties: {
    roles?: string;
    length?: number;
    [key: string]: any; // To allow for additional properties
  };
}
