import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import * as d3 from 'd3';
import {GraphLink, GraphNode, MotifGraphLink, MotifGraphNode} from "../../dtos/graph-dtos";
import { InterfaceService } from "../../service/interface.service";
import { HttpClientModule } from "@angular/common/http";
import { MatSlider, MatSliderRangeThumb } from "@angular/material/slider";
import {D3DragEvent} from "d3";
import {generate} from "rxjs";

@Component({
  selector: 'app-result-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    HttpClientModule,
    MatSlider,
    FormsModule,
    MatSliderRangeThumb
  ],
  templateUrl: './result-page.component.html',
  styleUrls: ['./result-page.component.css']
})
export class ResultPageComponent implements OnInit {
  private svg: any;
  private width = 1200;
  private height = 600;
  private simulationInstance: any;
  private graphZoom: d3.ZoomBehavior<SVGSVGElement, unknown>;

  searchData: any;
  private wholeGraphNodes: GraphNode[] = [];
  private wholeGraphLinks: GraphLink[] = [];
  private motifNodes: Set<string> = new Set();
  private motifLinks: GraphLink[] = [];
  private staticMotifNodes: MotifGraphNode[] = [];
  private staticMotifLinks: MotifGraphLink[] = [];

  sliderValue: number[] = [1950, 2023];
  protected lowerYear /*= this.sliderValue[0]*/;
  protected upperYear /*= this.sliderValue[1]*/;

  constructor(private service: InterfaceService, private router: Router, private route: ActivatedRoute) {
    this.searchData = history.state.data;
    this.staticMotifNodes = history.state.motifNodes;
    this.staticMotifLinks = history.state.motifLinks;
    this.lowerYear = history.state.startYear;
    this.upperYear = history.state.endYear;
    this.graphZoom = d3.zoom<SVGSVGElement, unknown>();

    this.sliderValue = [this.lowerYear, this.upperYear];
  }

  ngOnInit() {
    this.createSvg();
    this.initializeMotifs();
    this.fetchWholeGraphData();
  }

  private createSvg(): void {
    this.svg = d3.select('div#wholeGraphContainer')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .style('border', '1px solid black');

    this.graphZoom
      .extent([[0, 0], [this.width, this.height]])
      .scaleExtent([0.1, 10])
      .on('zoom', this.zoomGraph.bind(this));

    this.svg.append('rect')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('fill', 'none')
      .style('pointer-events', 'all');

    this.svg?.call(this.graphZoom);
  }

  private deleteSvg(): void {
    d3.select('div#wholeGraphContainer').select('svg').remove();
  }


  private initializeMotifs(): void {
    if (this.searchData) {
      const uniqueNodes = new Map<string, GraphNode>();
      const uniqueLinks = new Set<string>();

      for (const data of this.searchData) {
        if (data.graphData) {
          const nodes = data.graphData.nodes;
          const links = data.graphData.links;

          nodes.forEach((node: GraphNode) => {
            uniqueNodes.set(node.id, node);
          });

          links.forEach((link: GraphLink) => {
            const sourceExists = uniqueNodes.has(link.source);
            const targetExists = uniqueNodes.has(link.target);

            if (sourceExists && targetExists) {
              const linkKey = `${link.source}-${link.target}-${link.type}`;
              if (!uniqueLinks.has(linkKey)) {
                uniqueLinks.add(linkKey);
                this.motifLinks.push(link);
              }
            }
          });
        }
      }
      this.motifNodes = new Set(uniqueNodes.keys());
    } else {
      console.error('No search data found');
    }
  }

  private reinitializeMotifs(response: any): void {
      const uniqueNodes = new Map<string, GraphNode>();
      const uniqueLinks = new Set<string>();
      this.motifLinks = [];
      for (const data of response) {
        if (data.graphData) {
          const nodes = data.graphData.nodes;
          const links = data.graphData.links;

          nodes.forEach((node: GraphNode) => {
            uniqueNodes.set(node.id, node);
          });

          links.forEach((link: GraphLink) => {
            const sourceExists = uniqueNodes.has(link.source);
            const targetExists = uniqueNodes.has(link.target);

            if (sourceExists && targetExists) {
              const linkKey = `${link.source}-${link.target}-${link.type}`;
              if (!uniqueLinks.has(linkKey)) {
                uniqueLinks.add(linkKey);
                this.motifLinks.push(link);
              }
            }
          });
        }
      }
      this.motifNodes = new Set(uniqueNodes.keys());
      console.log('New Nodes: ' + this.motifNodes);
      console.log('New Links: ' + this.motifLinks);
  }

  private fetchWholeGraphData(): void {
    this.service.getGraph().subscribe(
      (response: any) => {
        this.wholeGraphNodes = response.nodes;
        const nodeIds = new Set(this.wholeGraphNodes.map(node => node.id));

        this.wholeGraphLinks = response.links.filter((link: GraphLink) => {
          const sourceExists = nodeIds.has(link.source);
          const targetExists = nodeIds.has(link.target);
          return sourceExists && targetExists;
        });

        this.drawWholeGraph(this.svg, this.wholeGraphNodes, this.wholeGraphLinks);
      },
      (error) => {
        console.error('Error fetching graph data:', error);
      }
    );
  }

  private drawWholeGraph(svg: any, nodes: GraphNode[], links: GraphLink[]): void {

    /*let linkGroup = this.svg.append('g')
      .attr('class', 'links');

    // Create links and their associated texts
    let linkElements = linkGroup.selectAll('.whole-link-group')
      .data(this.wholeGraphLinks)
      .enter()
      .append('g')
      .attr('class', 'whole-link-group');

    linkElements.append('line')
      .attr('class', 'whole-link')
      .style('stroke', 'black')
      .style('opacity', (d: GraphLink) =>
        this.motifLinks.some(motifLink => motifLink.source === d.source && motifLink.target === d.target && motifLink.type === d.type) ? 0.8 : 0.2)
      .style('stroke-width', 1.5);

    linkElements.append('text')
      .attr('class', 'whole-link-text')
      .attr('text-anchor', 'middle')
      .style('visibility', 'hidden')
      .style('fill', 'red')
      .style('font-weight', 'bold')
      .style('font-size', '15px')
      .text((d: GraphLink) => d.type);

    // Attach mouseover and mouseout events to the link groups
    linkElements
      .on('mouseover', function(this: SVGGElement) {

        d3.select(this).select('.whole-link-text')
          .style('visibility', 'visible');
      })
      .on('mouseout', function(this: SVGGElement) {

        d3.select(this).select('.whole-link-text')
          .style('visibility', 'hidden');
      });*/

    // Group the links by source and target while preserving individual links
    const groupedLinks = d3.group(this.wholeGraphLinks, d => `${d.source}-${d.target}`);

    const combinedLinks = Array.from(groupedLinks, ([key, links]) => {
      return {
        source: links[0].source,
        target: links[0].target,
        types: links.map(link => link.type).join(', '), // Combine all types into a single string
        individualLinks: links // Keep reference to all individual links
      };
    });

// Create a group element for links
    const linkGroup = this.svg.append('g')
      .attr('class', 'links');

// Create link elements based on the combined links
    const linkElements = linkGroup.selectAll('.whole-link-group')
      .data(combinedLinks)
      .enter()
      .append('g')
      .attr('class', 'whole-link-group');

    linkElements.append('line')
      .attr('class', 'whole-link')
      .style('stroke', 'black')
      .style('opacity', (d: any) => {
        // Check if any of the individual links are in the motifLinks
        // @ts-ignore
        const isInMotif = d.individualLinks.some(link =>
          this.motifLinks.some(motifLink =>
            motifLink.source === link.source &&
            motifLink.target === link.target &&
            motifLink.type === link.type
          )
        );
        return isInMotif ? 0.8 : 0.2;
      })
      .style('stroke-width', 1);

// Add text labels for the combined links
    linkElements.append('text')
      .attr('class', 'whole-link-text')
      .attr('text-anchor', 'middle')
      .style('visibility', 'hidden')
      .style('fill', 'red')
      .text((d: any) => d.types); // Display the combined types

// Handle mouseover and mouseout events to show/hide text
    linkElements
      .on('mouseover', function (this: SVGGElement) {
        d3.select(this).select('.whole-link-text')
          .style('visibility', 'visible');
      })
      .on('mouseout', function (this: SVGGElement) {
        d3.select(this).select('.whole-link-text')
          .style('visibility', 'hidden');
      });


    const node = this.svg.selectAll('.whole-node')
      .data(this.wholeGraphNodes)
      .enter()
      .append('g')
      .attr('class', 'whole-node')
      .on('click', (event: MouseEvent, d: GraphNode) => this.onNodeLeftClick(event, d))
      .call(d3.drag<Element, GraphNode>()
        .on('start', (event: any, d: GraphNode) => this.dragstarted(event, d))
        .on('drag', (event: any, d: GraphNode) => this.dragged(event, d))
        .on('end', (event: any, d: GraphNode) => this.dragended(event, d)));

    node.append('circle')
      .attr('r', 5)
      .style('opacity', (d: GraphNode) => this.motifNodes.has(d.id) ? 1 : 0.2)
      .style('fill', (d: GraphNode) => this.getNodeColor(d));

    node.append('text')
      .attr('dy', -3)
      .attr('x', 12)
      .style('font-size', '10px')
      .text((d: GraphNode) => {
        if (d.type === 'Person') {
          return d.properties.name;
        } else if (d.type === 'Movie') {
          // @ts-ignore
          return d.properties.title;
        } else {
          return '';
        }
      });

    this.simulationWholeGraph(this.wholeGraphNodes, this.wholeGraphLinks);
  }


  private getNodeColor(node: GraphNode): string {
    //return this.motifNodes.has(node.id) ? '#ff0000' : (node.type === 'Person' ? '#69b3a2' : '#ffab00');
    return node.type === 'Person' ? '#69b3a2' : '#ffab00';
  }

  private simulationWholeGraph(nodes: GraphNode[], links: GraphLink[]): void {
    const boundaryMargin = 20;

    if (!this.simulationInstance) {
      const nodeIdMap = new Map(this.wholeGraphNodes.map(node => [node.id, node]));
      const transformedLinks: GraphLink[] = links.map(link => ({
        source: link.source,
        target: link.target,
        type: link.type || '',
        properties: link.properties || {}
      }));

      this.simulationInstance = d3.forceSimulation(this.wholeGraphNodes)
        .force('whole-link', d3.forceLink<GraphNode, GraphLink>(transformedLinks)
          .id((d: GraphNode) => d.id)
          .distance(50))
        .force('charge', d3.forceManyBody().strength(-20))
        .force('center', d3.forceCenter(1200 / 2, 600 / 2))
        .alpha(1)
        .on('tick', () => {
          this.updateWholeSimulation();
        });

      this.simulationInstance.nodes(this.wholeGraphNodes).on('tick', () => {
        this.svg.selectAll('.whole-node')
          .attr('transform', (d: GraphNode) => {
            d.x = Math.max(boundaryMargin, Math.min(1200 - boundaryMargin, d.x || 0));
            d.y = Math.max(boundaryMargin, Math.min(this.height - boundaryMargin, d.y || 0));
            return `translate(${d.x}, ${d.y})`;
          });

        this.svg.selectAll('.whole-link')
          .attr('x1', (d: GraphLink) => {
            const sourceNode = nodeIdMap.get(d.source);
            return sourceNode ? sourceNode.x : 0; // Default to 0 if node is not found
          })
          .attr('y1', (d: GraphLink) => {
            const sourceNode = nodeIdMap.get(d.source);
            return sourceNode ? sourceNode.y : 0; // Default to 0 if node is not found
          })
          .attr('x2', (d: GraphLink) => {
            const targetNode = nodeIdMap.get(d.target);
            return targetNode ? targetNode.x : 0; // Default to 0 if node is not found
          })
          .attr('y2', (d: GraphLink) => {
            const targetNode = nodeIdMap.get(d.target);
            return targetNode ? targetNode.y : 0; // Default to 0 if node is not found
          });

        this.svg.selectAll('.whole-link-text')
          .style('font-size', '7px')
          .style('opacity', 0.8)
          .attr('x', (d: GraphLink) => {
            const sourceNode = nodeIdMap.get(d.source);
            const targetNode = nodeIdMap.get(d.target);
            if (sourceNode && targetNode) {
              // @ts-ignore
              return (sourceNode.x + targetNode.x) / 2;
            }
            return 0;
          })
          .attr('y', (d: GraphLink) => {
            const sourceNode = nodeIdMap.get(d.source);
            const targetNode = nodeIdMap.get(d.target);
            if (sourceNode && targetNode) {
              // @ts-ignore
              return (sourceNode.y + targetNode.y) / 2;
            }
            return 0;
          });
      });
    } else {
      this.simulationInstance.nodes(nodes);
      this.simulationInstance.force('whole-link').links(links);
      this.simulationInstance.alpha(1).restart();
    }
  }

  /*private updateGraphOpacity(): void {
    // Update link opacity
    this.svg.selectAll('.whole-link')
      .style('opacity', (d: GraphLink) =>
        this.motifLinks.some(motifLink =>
          motifLink.source === d.source && motifLink.target === d.target && motifLink.type === d.type) ? 0.8 : 0.2
      );

    // Update node opacity
    this.svg.selectAll('.whole-node circle')
      .style('opacity', (d: GraphNode) => this.motifNodes.has(d.id) ? 1 : 0.2);
  }*/

  private updateGraphOpacity(): void {
    // Update link opacity
    this.svg.selectAll('.whole-link-group .whole-link')
      .style('opacity', (d: any) => {
        // Check if any of the individual links in this group match a motif link
        const isInMotif = d.individualLinks.some((link: GraphLink) =>
          this.motifLinks.some(motifLink =>
            motifLink.source === link.source &&
            motifLink.target === link.target &&
            motifLink.type === link.type
          )
        );
        return isInMotif ? 0.8 : 0.2;
      });

    // Update node opacity
    this.svg.selectAll('.whole-node circle')
      .style('opacity', (d: GraphNode) => this.motifNodes.has(d.id) ? 1 : 0.2);
  }


  onSliderChange(event: any): void {
    console.log('Slider value changed:', this.sliderValue);
    this.lowerYear = this.sliderValue[0];
    this.upperYear = this.sliderValue[1];

    // Make the request to get the updated results
    this.service.getResults(this.staticMotifNodes, this.staticMotifLinks, this.lowerYear, this.upperYear)
      .subscribe(
        (response: any) => {
          //console.log('First motif links:', this.motifLinks);
          //console.log('First motif nodes:', this.motifNodes);
          //console.log('Response', response);
          this.reinitializeMotifs(response);
          //console.log('Changed motif links:', this.motifLinks);
          //console.log('Changed motif nodes:', this.motifNodes);
          //this.drawWholeGraph(this.svg, this.wholeGraphNodes, this.wholeGraphLinks);
          this.updateGraphOpacity();
        },
        (error) => {
          console.error('Error fetching updated graph data:', error);
        }
      );
  }

  formatLabel(value: number): string {
    return value.toString();
  }

  private dragstarted(event: any, d: any): void {
    if (!event.active) {
      this.simulationInstance.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(event: any, d: any): void {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragended(event: any, d: any): void {
    if (!event.active) {
      this.simulationInstance.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;
  }

  private zoomGraph($event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
    if (!$event.transform) return;

    this.svg?.attr('transform', `${$event.transform}`);
  }

  private updateWholeSimulation() {
    this.simulationInstance
      .nodes(this.wholeGraphNodes)
      .force('whole-link', d3.forceLink<GraphNode, GraphLink>(this.wholeGraphLinks).id((d: GraphNode) => d.id).distance(50))
      .alpha(1)
      .restart();
  }

  private onNodeLeftClick(event: MouseEvent, node: GraphNode): void {
    alert(`Clicked on node: ${node.type}`);
  }
}

/*import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import * as d3 from 'd3';
import { GraphLink, GraphNode, MotifGraphLink, MotifGraphNode } from "../../dtos/graph-dtos";
import { InterfaceService } from "../../service/interface.service";
import { D3DragEvent } from "d3";
import { HttpClientModule } from "@angular/common/http";
import { MatSlider, MatSliderRangeThumb } from "@angular/material/slider";

@Component({
  selector: 'app-result-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    HttpClientModule,
    MatSlider,
    FormsModule,
    MatSliderRangeThumb
  ],
  templateUrl: './result-page.component.html',
  styleUrls: ['./result-page.component.css']
})
export class ResultPageComponent implements OnInit {
  searchData: any; // Adjust types as per your data structure
  private svg: any;
  private width = 1200;
  private height = 500;
  private simulationInstance: any;

  private wholeGraphNodes: GraphNode[] = [];
  private wholeGraphLinks: GraphLink[] = [];

  sliderValue: number[] = [1950, 2023];
  private lowerYear = this.sliderValue[0];
  private upperYear = this.sliderValue[1];

  motifNodes: GraphNode[] = [];
  motifLinks: GraphLink[] = [];
  private staticMotifNodes: MotifGraphNode[] = [];
  private staticMotifLinks: MotifGraphLink[] = [];

  constructor(
    private service: InterfaceService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.searchData = history.state.data;
    this.staticMotifNodes = history.state.motif.nodes;
    this.staticMotifLinks = history.state.motif.links;
    console.log('Data: ', history.state);
    console.log('Received response from backend in second page:', this.searchData);
    console.log(this.staticMotifNodes);
    console.log(this.staticMotifLinks);
  }

  ngOnInit() {
    this.createSvg();
    this.initializeMotifData();
    this.drawWholeGraph(this.svg, this.wholeGraphNodes, this.wholeGraphLinks);
  }

  private createSvg(): void {
    this.svg = d3.select('div#wholeGraphContainer')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .style('border', '1px solid black');
  }

  private initializeMotifData(): void {
    if (this.searchData) {
      const uniqueNodes = new Map<string, GraphNode>();
      const uniqueLinks = new Set<string>();

      for (const data of this.searchData) {
        if (data.graphData) {
          const nodes = data.graphData.nodes;
          const links = data.graphData.links;

          nodes.forEach((node: GraphNode) => {
            uniqueNodes.set(node.id, node);
          });

          links.forEach((link: GraphLink) => {
            const sourceExists = uniqueNodes.has(link.source);
            const targetExists = uniqueNodes.has(link.target);

            if (sourceExists && targetExists) {
              const linkKey = `${link.source}-${link.target}-${link.type}`;
              if (!uniqueLinks.has(linkKey)) {
                uniqueLinks.add(linkKey);
                this.motifLinks.push(link);
              }
            }
          });
        }
      }
      this.motifNodes = Array.from(uniqueNodes.values());
    } else {
      console.error('No search data found');
    }
  }

  private drawWholeGraph(svg: any, nodes: GraphNode[], links: GraphLink[]): void {
    // Clear previous graph
    svg.selectAll('*').remove();

    const linkGroup = svg.append('g')
      .attr('class', 'links');

    const linkElements = linkGroup.selectAll('.whole-link-group')
      .data(links)
      .enter()
      .append('g')
      .attr('class', 'whole-link-group');

    linkElements.append('line')
      .attr('class', 'whole-link')
      .style('stroke', 'black')
      .style('opacity', (d: GraphLink) => this.motifLinks.includes(d) ? 1 : 0.2)
      .style('stroke-width', 1);

    linkElements.append('text')
      .attr('class', 'whole-link-text')
      .attr('text-anchor', 'middle')
      .style('visibility', 'hidden')
      .style('fill', 'red')
      .style('font-weight', 'bold')
      .style('font-size', '12px')
      .text((d: GraphLink) => d.type);

    linkElements
      .on('mouseover', function (this: SVGGElement) {
        d3.select(this).select('.whole-link-text')
          .style('visibility', 'visible');
      })
      .on('mouseout', function (this: SVGGElement) {
        d3.select(this).select('.whole-link-text')
          .style('visibility', 'hidden');
      });

    const nodeGroup = svg.append('g')
      .attr('class', 'nodes');

    const nodeElements = nodeGroup.selectAll('.whole-node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'whole-node')
      .call(d3.drag<Element, GraphNode>()
        .on('start', (event: D3DragEvent<SVGElement, any, GraphNode>, d: GraphNode) => this.dragstarted(event, d))
        .on('drag', (event: D3DragEvent<SVGElement, any, GraphNode>, d: GraphNode) => this.dragged(event, d))
        .on('end', (event: D3DragEvent<SVGElement, any, GraphNode>, d: GraphNode) => this.dragended(event, d)))
      .on('click', (event: MouseEvent, d: GraphNode) => this.onNodeLeftClick(event, d));

    nodeElements.append('circle')
      .attr('r', 5)
      .style('fill', (d: GraphNode) => this.motifNodes.includes(d) ? '#ff5722' : this.getNodeColor(d.type));

    nodeElements.append('text')
      .attr('dy', -3)
      .attr('x', 12)
      .style('font-size', '10px')
      // @ts-ignore
      .text((d: GraphNode) => d.type === 'Person' ? d.properties.name : d.properties.title);

    this.simulationWholeGraph(nodes, links);
  }

  formatLabel(value: number): string {
    return value.toString();
  }

  onSliderChange(event: any): void {
    console.log('Slider value changed:', this.sliderValue);
    this.lowerYear = this.sliderValue[0];
    this.upperYear = this.sliderValue[1];

    // Make the request to get the updated results
    this.service.getResults(this.motifNodes, this.motifLinks, this.lowerYear, this.upperYear)
      .subscribe(
        (response: any) => {
          console.log('Received response from backend:', response);
          this.wholeGraphNodes = response.nodes;
          this.wholeGraphLinks = response.links;
          this.drawWholeGraph(this.svg, this.wholeGraphNodes, this.wholeGraphLinks);
        },
        (error) => {
          console.error('Error fetching updated graph data:', error);
        }
      );
  }

  private dragstarted(event: D3DragEvent<SVGElement, any, any>, d: any): void {
    if (!event.active) {
      this.simulationInstance.alphaTarget(0.3).restart();
    }
  }

  private dragged(event: D3DragEvent<SVGElement, any, any>, d: any): void {
    d.x = event.x;
    d.y = event.y;

    this.updateLinks(this.svg, d);
  }

  private dragended(event: D3DragEvent<SVGElement, any, any>, d: any): void {
    if (!event.active) {
      this.simulationInstance.alphaTarget(0);
    }

    this.updateLinks(this.svg, d);
  }

  private updateLinks(svgElement: any, d: any): void {
    svgElement.selectAll('.link')
      .attr('x1', (link: any) => link.source === d ? d.x : link.source.x)
      .attr('y1', (link: any) => link.source === d ? d.y : link.source.y)
      .attr('x2', (link: any) => link.target === d ? d.x : link.target.x)
      .attr('y2', (link: any) => link.target === d ? d.y : link.target.y);
  }

  private simulationWholeGraph(nodes: GraphNode[], links: GraphLink[]): void {
    const boundaryMargin = 20;

    if (!this.simulationInstance) {
      this.simulationInstance = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(50))
        .force('charge', d3.forceManyBody())
        .force('center', d3.forceCenter(this.width / 2, this.height / 2))
        .force('x', d3.forceX())
        .force('y', d3.forceY());
    } else {
      this.simulationInstance.nodes(nodes);
      this.simulationInstance.force('link').links(links);
    }

    this.simulationInstance.on('tick', () => {
      this.svg.selectAll('.whole-node')
        .attr('transform', (d: GraphNode) => `translate(${d.x},${d.y})`);

      this.svg.selectAll('.whole-link')
        .attr('x1', (d: GraphLink) => d.source.x)
        .attr('y1', (d: GraphLink) => d.source.y)
        .attr('x2', (d: GraphLink) => d.target.x)
        .attr('y2', (d: GraphLink) => d.target.y);
    });
  }

  private onNodeLeftClick(event: MouseEvent, node: GraphNode): void {
    // Handle node click event if necessary
  }

  private getNodeColor(type: string): string {
    // Return node color based on type or other criteria
    return '#00f'; // Example color
  }
}*/





