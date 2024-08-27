package com.example.graphbackend.controller;

import com.example.graphbackend.GraphNode;
import com.example.graphbackend.GraphLink;
import com.example.graphbackend.repository.GraphNodeRepository;
import com.example.graphbackend.service.GraphNodeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

import static org.neo4j.cypherdsl.core.Functions.id;

@RestController
@RequestMapping("/api/graph")
public class GraphController {

    @Autowired
    private GraphNodeRepository graphNodeRepository;

    @Autowired
    private GraphNodeService graphNodeService;

    @CrossOrigin(origins = "http://localhost:4200")
    @PostMapping("/search")
    public Collection<Map<String, Object>> searchPattern(@RequestBody Map<String, Object> requestBody) {
        List<Map<String, String>> nodesData = (List<Map<String, String>>) requestBody.get("nodes");
        List<Map<String, Object>> linksData = (List<Map<String, Object>>) requestBody.get("links");

        int lowerYear = (int) requestBody.get("lowerYear");
        int upperYear = (int) requestBody.get("upperYear");

        GraphNode[] nodes = new GraphNode[nodesData.size()];
        int i = 0;
        for (Map<String, String> node : nodesData) {
            nodes[i] = new GraphNode(node.get("id"), node.get("type"));
            i++;
        }

        GraphLink[] links = new GraphLink[linksData.size()];
        int j = 0;
        for (Map<String, Object> link : linksData) {
            GraphNode sourceNode = convertToGraphNode((Map<String, String>) link.get("source"));
            GraphNode targetNode = convertToGraphNode((Map<String, String>) link.get("target"));
            links[j] = new GraphLink(sourceNode, targetNode, (String) link.get("type"));
            j++;
        }

        String cypherQuery = generateCypherQuery(Arrays.stream(nodes).toList(), Arrays.stream(links).toList(), lowerYear, upperYear);
        return graphNodeService.executeDynamicQuery(cypherQuery);
    }

    @CrossOrigin(origins = "http://localhost:4200")
    @PostMapping("/getGraph")
    public Map<String, Object> getAll() {
        return graphNodeService.getAll(
                "MATCH (n)-[r]->(m) " +
                "WITH collect(DISTINCT n) + collect(DISTINCT m) AS nodes, collect(DISTINCT r) AS relationships " +
                "RETURN { " +
                "nodes: [node in nodes | { " +
                "id: elementId(node), " +
                "type: labels(node)[0], " +
                "properties: properties(node) " +
                "}], " +
                "links: [rel in relationships | { " +
                "source: elementId(startNode(rel)), " +
                "target: elementId(endNode(rel)), " +
                "type: type(rel), " +
                "properties: properties(rel) " +
                "}] " +
                "} AS graphData ");
    }

    /*private static String generateCypherQuery(List<GraphNode> nodes, List<GraphLink> links, int lowerYear, int upperYear) {
        StringBuilder matchClause = new StringBuilder("MATCH ");
        StringBuilder whereClause = new StringBuilder();
        StringBuilder returnClause = new StringBuilder("RETURN { ");

        // Build the MATCH clause
        for (int i = 0; i < links.size(); i++) {
            GraphLink link = links.get(i);
            if (i > 0) {
                matchClause.append(", ");
            }
            matchClause.append(String.format("(%s:%s)-[r%d:%s]->(%s:%s)",
                    'n' + link.getSource().getId(), link.getSource().getType(),
                    i, link.getType(),
                    'n' + link.getTarget().getId(), link.getTarget().getType()));
        }

        // Filter nodes to get only Movie nodes for the WHERE clause
        List<String> movieNodes = nodes.stream()
                .filter(node -> "Movie".equals(node.getType()))
                .map(node -> node.getId())
                .collect(Collectors.toList());

        // Build the WHERE clause
        if (!movieNodes.isEmpty()) {
            whereClause.append(" WHERE ");
            whereClause.append(String.join(" AND ", movieNodes.stream()
                    .map(movie -> String.format("n%s.released >= %d AND n%s.released <= %d", movie, lowerYear, movie, upperYear))
                    .collect(Collectors.toList())));

            // Add constraint to ensure different movies for WROTE and PRODUCED relationships
            if (movieNodes.size() > 1) {
                List<String> movieConstraints = new ArrayList<>();
                for (int i = 0; i < movieNodes.size(); i++) {
                    for (int j = i + 1; j < movieNodes.size(); j++) {
                        movieConstraints.add(String.format("n%s <> n%s", movieNodes.get(i), movieNodes.get(j)));
                    }
                }
                whereClause.append(" AND ");
                whereClause.append(String.join(" AND ", movieConstraints));
            }
        }

        // Build the RETURN clause for nodes
        returnClause.append("nodes: [");
        returnClause.append(nodes.stream()
                .map(node -> String.format("{ id: elementId(n%s), type: labels(n%s)[0], properties: properties(n%s) }",
                        node.getId(), node.getId(), node.getId()))
                .collect(Collectors.joining(", ")));
        returnClause.append("], ");

        // Build the RETURN clause for relationships
        returnClause.append("links: [");
        returnClause.append(links.stream()
                .map(link -> String.format("{ source: elementId(n%s), target: elementId(n%s), type: type(r%s), properties: properties(r%s) }",
                        link.getSource().getId(), link.getTarget().getId(), links.indexOf(link), links.indexOf(link)))
                .collect(Collectors.joining(", ")));
        returnClause.append("] } AS graphData");

        // Print and return the query
        String query = matchClause.toString() + whereClause.toString() + " " + returnClause.toString();
        System.out.println(query);
        return query;
    }*/

    private static String generateCypherQuery(List<GraphNode> nodes, List<GraphLink> links, int lowerYear, int upperYear) {
        StringBuilder matchClause = new StringBuilder("MATCH ");
        StringBuilder whereClause = new StringBuilder();
        StringBuilder returnClause = new StringBuilder("RETURN { ");

        // Track Person nodes to avoid duplication
        Set<String> personNodes = new HashSet<>();

        // Build the MATCH clause
        for (int i = 0; i < links.size(); i++) {
            GraphLink link = links.get(i);
            if (i > 0) {
                matchClause.append(", ");
            }
            matchClause.append(String.format("(%s:%s)-[r%d:%s]->(%s:%s)",
                    'n' + link.getSource().getId(), link.getSource().getType(),
                    i, link.getType(),
                    'n' + link.getTarget().getId(), link.getTarget().getType()));

            // Track person nodes for constraints
            if ("Person".equals(link.getSource().getType())) {
                personNodes.add(link.getSource().getId());
            }
            if ("Person".equals(link.getTarget().getType())) {
                personNodes.add(link.getTarget().getId());
            }
        }

        // Filter nodes to get only Movie nodes for the WHERE clause
        List<String> movieNodes = nodes.stream()
                .filter(node -> "Movie".equals(node.getType()))
                .map(node -> node.getId())
                .collect(Collectors.toList());

        // Build the WHERE clause
        if (!movieNodes.isEmpty()) {
            whereClause.append(" WHERE ");
            whereClause.append(String.join(" AND ", movieNodes.stream()
                    .map(movie -> String.format("n%s.released >= %d AND n%s.released <= %d", movie, lowerYear, movie, upperYear))
                    .collect(Collectors.toList())));

            // Add constraint to ensure different movies for WROTE and PRODUCED relationships
            if (movieNodes.size() > 1) {
                List<String> movieConstraints = new ArrayList<>();
                for (int i = 0; i < movieNodes.size(); i++) {
                    for (int j = i + 1; j < movieNodes.size(); j++) {
                        movieConstraints.add(String.format("n%s <> n%s", movieNodes.get(i), movieNodes.get(j)));
                    }
                }
                whereClause.append(" AND ");
                whereClause.append(String.join(" AND ", movieConstraints));
            }
        }

        // Add constraint to ensure different Person nodes for different roles
        if (personNodes.size() > 1) {
            List<String> personConstraints = new ArrayList<>();
            List<String> personList = new ArrayList<>(personNodes);
            for (int i = 0; i < personList.size(); i++) {
                for (int j = i + 1; j < personList.size(); j++) {
                    personConstraints.add(String.format("n%s <> n%s", personList.get(i), personList.get(j)));
                }
            }
            whereClause.append(" AND ");
            whereClause.append(String.join(" AND ", personConstraints));
        }

        // Build the RETURN clause for nodes
        returnClause.append("nodes: [");
        returnClause.append(nodes.stream()
                .map(node -> String.format("{ id: elementId(n%s), type: labels(n%s)[0], properties: properties(n%s) }",
                        node.getId(), node.getId(), node.getId()))
                .collect(Collectors.joining(", ")));
        returnClause.append("], ");

        // Build the RETURN clause for relationships
        returnClause.append("links: [");
        returnClause.append(links.stream()
                .map(link -> String.format("{ source: elementId(n%s), target: elementId(n%s), type: type(r%s), properties: properties(r%s) }",
                        link.getSource().getId(), link.getTarget().getId(), links.indexOf(link), links.indexOf(link)))
                .collect(Collectors.joining(", ")));
        returnClause.append("] } AS graphData");

        // Print and return the query
        String query = matchClause.toString() + whereClause.toString() + " " + returnClause.toString();
        System.out.println(query);
        return query;
    }





    private static GraphNode convertToGraphNode(Map<String, String> nodeData) {
        if (nodeData == null || !nodeData.containsKey("id") || !nodeData.containsKey("type")) {
            return null;
        }

        String id = nodeData.get("id");
        String type = nodeData.get("type");
        return new GraphNode(id, type);
    }
}

