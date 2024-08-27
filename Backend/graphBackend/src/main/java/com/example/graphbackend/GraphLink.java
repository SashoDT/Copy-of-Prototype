package com.example.graphbackend;

import java.io.Serializable;

public class GraphLink implements Serializable {
    private GraphNode source;
    private GraphNode target;
    private String type;


    public GraphLink(GraphNode source, GraphNode target, String type) {
        this.source = source;
        this.target = target;
        this.type = type;
    }
    // Getters and setters
    public GraphNode getSource() {
        return source;
    }

    public void setSource(GraphNode source) {
        this.source = source;
    }

    public GraphNode getTarget() {
        return target;
    }

    public void setTarget(GraphNode target) {
        this.target = target;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}