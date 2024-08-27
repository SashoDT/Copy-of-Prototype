import {MotifGraphNode, MotifGraphLink, GraphLink, GraphNode} from "../dtos/graph-dtos";
import {Component, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import * as d3 from 'd3';
import {D3DragEvent, link, zoom} from 'd3';
import {FormsModule} from '@angular/forms';
import {NgIf} from "@angular/common";
import {InterfaceService} from "../service/interface.service";
import {HttpClientModule} from '@angular/common/http';


@Component({
  selector: 'app-graph',
  templateUrl: './interface.component.html',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    HttpClientModule
  ],
  providers: [InterfaceService],
  styleUrls: ['./interface.component.css']
})
export class InterfaceComponent implements OnInit {
  @ViewChild('graphInterface', {static: true})

  private motifSvg: any;
  private wholeGraphSvg: any;
  private width = 1200;
  private height = 600;
  private nodeNumber = 2;
  private simulationInstance: any;
  private wholeSimulationInstance: any;
  private graphZoom: d3.ZoomBehavior<SVGSVGElement, unknown>;

  private motifNodes: MotifGraphNode[] = [
    {id: '1', type: 'Person'},
    {id: '2', type: 'Movie'}
  ];
  private motifLinks: MotifGraphLink[] = [];

  private wholeGraphNodes: GraphNode[] = [];
  private wholeGraphLinks: GraphLink[] = [];

  public lowerYear: number = 1950;
  public upperYear: number = 2023;
  public selected: MotifGraphNode[] = [];


  constructor(private service: InterfaceService, private router: Router) {
    this.graphZoom = d3.zoom<SVGSVGElement, unknown>();
  }

  ngOnInit() {
    this.createSvg();

    this.drawMotif();

    //Get the data for the whole graph visualization
    this.service.getGraph().subscribe(
      (response: any) => {
        this.wholeGraphNodes = response.nodes;

        //Use this set to easier look up the link sources and targets that are just ids
        const nodeIds = new Set(this.wholeGraphNodes.map(node => node.id));

        //Extra check for existence of nodes
        this.wholeGraphLinks = response.links.filter((link: GraphLink) => {
          const sourceExists = nodeIds.has(link.source);
          const targetExists = nodeIds.has(link.target);
          if (sourceExists && targetExists) {
            return sourceExists && targetExists;
          } else {
            return ;
          }
        });
        this.drawWholeGraph();
      },
      (error) => {
        console.error('Error fetching graph data:', error);
      }
    );
  }

  private createSvg(): void {
    this.motifSvg = d3.select('div#motifGraphContainer')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .style('border', '1px solid black');

    this.graphZoom
      .extent([[0, 0], [this.width, this.height]])
      .scaleExtent([0.1, 10])
      .on('zoom', this.zoomGraph.bind(this));

    this.wholeGraphSvg = d3.select('div#wholeGraphContainer')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .style('border', '1px solid black');

    this.wholeGraphSvg.append('rect')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('fill', 'none')
      .style('pointer-events', 'all');

    this.wholeGraphSvg?.call(this.graphZoom);
  }

  private drawMotif(): void {
    const combinedMotifLinks = this.motifLinks.reduce((acc: any[], link) => {
      const existingLink = acc.find(l => l.source === link.source && l.target === link.target);

      if (existingLink) {
        // Combine types if there's an existing link between the same source and target
        existingLink.types.push(link.type);
      } else {
        // Add a new entry if no existing link is found
        acc.push({
          source: link.source,
          target: link.target,
          types: [link.type],
        });
      }

      return acc;
    }, []);

    const link = this.motifSvg.selectAll('.link')
      .data(combinedMotifLinks)
      .enter()
      .append('line')
      .attr('class', 'link')
      .style('stroke', '#000000')
      .style('opacity', 0.5)
      .style('stroke-width', 3)
      .on('click', (event: MouseEvent, d: any) => this.onLinkClick(event, d));

    const linkText = this.motifSvg.selectAll('.link-text')
      .data(combinedMotifLinks)
      .enter()
      .append('text')
      .attr('class', 'link-text')
      .attr('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .text((d: any) => d.types.join(', '));
    /*const link = this.motifSvg.selectAll('.link')
      .data(this.motifLinks)
      .enter()
      .append('line')
      .attr('class', 'link')
      .style('stroke', '#000000')
      .style('opacity', 0.5)
      .style('stroke-width', 3)
      .on('click', (event: MouseEvent, d: MotifGraphLink) => this.onLinkClick(event, d));

    const linkText = this.motifSvg.selectAll('.link-text')
      .data(this.motifLinks)
      .enter()
      .append('text')
      .attr('class', 'link-text')
      .attr('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .text((d: MotifGraphLink) => d.type);*/

    let node = this.motifSvg.selectAll('.node')
      .data(this.motifNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .on('contextmenu', (event: MouseEvent, d: MotifGraphNode) => this.onNodeRightClick(event, d))
      .on('click', (event: MouseEvent, d: MotifGraphNode) => this.onNodeLeftClick(event, d))
      .call(d3.drag<Element, MotifGraphNode>()
        .on('start', (event: D3DragEvent<SVGElement, any, MotifGraphNode>, d: MotifGraphNode) => this.dragstarted(event, d))
        .on('drag', (event: D3DragEvent<SVGElement, any, MotifGraphNode>, d: MotifGraphNode) => this.dragged(event, d))
        .on('end', (event: D3DragEvent<SVGElement, any, MotifGraphNode>, d: MotifGraphNode) => this.dragended(event, d)));

    node.append('circle')
      .attr('r', 15)
      .style('fill', (d: MotifGraphNode) => this.getNodeColor(d.type));

    node.append('text')
      .attr('dy', -3)
      .attr('x', 12)
      .text((d: MotifGraphNode) => `${d.type}`);

    this.simulation(this.motifNodes, this.motifLinks);
  }

  private drawWholeGraph(): void {

    /*const link = this.wholeGraphSvg.selectAll('.whole-link')
      .data(this.wholeGraphLinks)
      .enter()
      .append('line')
      .style('stroke', '#000000')
      .attr('class', 'whole-link')
      .style('opacity', 0.5)
      .style('stroke-width', 1)
      .on('mouseover', function(this: SVGLineElement) {
        // Change color on mouseover
        d3.select(this)
          .style('stroke', 'red')
          .style('opacity', 1.0);

        // Show the link text
        d3.select(this).select('.whole-link-text').style('visibility', 'visible');
      })
      .on('mouseout', function(this: SVGLineElement) {
        // Revert color on mouseout
        d3.select(this)
          .style('opacity', 0.5);

        // Hide the link text
        d3.select(this).select('.whole-link-text').style('visibility', 'hidden');
      });


    const linkText = this.wholeGraphSvg.selectAll('.whole-link-text')
      .data(this.wholeGraphLinks)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('class', 'whole-link-text')
      .style('visibility', 'hidden')
      .text((d: GraphLink) => d.type);*/

    // This is complexer for the hover text logic
    /*const linkGroup = this.wholeGraphSvg.append('g')
      .attr('class', 'links');

    // Create links and their texts
    const linkElements = linkGroup.selectAll('.whole-link-group')
      .data(this.wholeGraphLinks)
      .enter()
      .append('g')
      .attr('class', 'whole-link-group');

    linkElements.append('line')
      .attr('class', 'whole-link')
      .style('stroke', 'grey')
      .style('stroke-width', 2);

    linkElements.append('text')
      .attr('class', 'whole-link-text')
      .attr('text-anchor', 'middle')
      .style('visibility', 'hidden')
      .style('fill', 'red')
      .text((d: GraphLink) => d.type);

    linkElements
      .on('mouseover', function(this: SVGGElement) {

        d3.select(this).select('.whole-link-text')
          .style('visibility', 'visible');
      })
      .on('mouseout', function(this: SVGGElement) {

        d3.select(this).select('.whole-link-text')
          .style('visibility', 'hidden');
      });*/

    // Group the links by source and target
    const groupedLinks = d3.group(this.wholeGraphLinks, d => `${d.source}-${d.target}`);

// Transform the grouped links into a new data structure
    const combinedLinks = Array.from(groupedLinks, ([key, links]) => {
      return {
        source: links[0].source,
        target: links[0].target,
        types: links.map(link => link.type).join(', ') // Combine all types into a single string
      };
    });

// Create a group element for links
    const linkGroup = this.wholeGraphSvg.append('g')
      .attr('class', 'links');

// Create link elements based on the combined links
    const linkElements = linkGroup.selectAll('.whole-link-group')
      .data(combinedLinks)
      .enter()
      .append('g')
      .attr('class', 'whole-link-group');

    linkElements.append('line')
      .attr('class', 'whole-link')
      .style('stroke', 'grey')
      .style('stroke-width', 2);

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


    const node = this.wholeGraphSvg.selectAll('.whole-node')
      .data(this.wholeGraphNodes)
      .enter()
      .append('g')
      .attr('class', 'whole-node')
      .on('click', (event: MouseEvent, d: GraphNode) => this.onNodeLeftClick(event, d))
      .call(d3.drag<Element, GraphNode>()
        .on('start', (event: D3DragEvent<SVGElement, any, GraphNode>, d: GraphNode) => this.dragstarted(event, d))
        .on('drag', (event: D3DragEvent<SVGElement, any, GraphNode>, d: GraphNode) => this.dragged(event, d))
        .on('end', (event: D3DragEvent<SVGElement, any, GraphNode>, d: GraphNode) => this.dragended(event, d)));

    node.append('circle')
      .attr('r', 5)
      .style('fill', (d: GraphNode) => this.getNodeColor(d.type));

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


  private simulation(motifNodes: MotifGraphNode[], motifLinks: MotifGraphLink[]): any {
    if (!this.simulationInstance) {
      const boundaryMargin = 20;
      this.simulationInstance = d3.forceSimulation()
        .force('link', d3.forceLink<MotifGraphNode, MotifGraphLink>(this.motifLinks).id((d: MotifGraphNode) => d.id).distance(200))
        .force('charge', d3.forceManyBody().strength(-10))
        .force('center', d3.forceCenter(600 / 2, 600 / 2));

      this.simulationInstance.nodes(this.motifNodes).on('tick', () => {
        this.motifSvg.selectAll('.node')
          .attr('transform', (d: MotifGraphNode) => {
            d.x = Math.max(boundaryMargin, Math.min(this.width - boundaryMargin, d.x || 0));
            d.y = Math.max(boundaryMargin, Math.min(this.height - boundaryMargin, d.y || 0));
            return `translate(${d.x}, ${d.y})`;
          });

        this.motifSvg.selectAll('.link')
          .attr('x1', (d: MotifGraphLink) => (d.source as MotifGraphNode).x)
          .attr('y1', (d: MotifGraphLink) => (d.source as MotifGraphNode).y)
          .attr('x2', (d: MotifGraphLink) => (d.target as MotifGraphNode).x)
          .attr('y2', (d: MotifGraphLink) => (d.target as MotifGraphNode).y);

        this.motifSvg.selectAll('.link-text')
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2)
          .style('font-size', '12px')
          .style('fill', (d: MotifGraphLink) => this.getLinkTextColor(d.type))
          .style('opacity', 0.8);
      });
    }
    return this.simulationInstance;
  }

  private simulationWholeGraph(nodes: GraphNode[], links: GraphLink[]): void {
    const boundaryMargin = 20;

    if (!this.wholeSimulationInstance) {
      // This is again to handle the fact that unlike MotifLinks the GraphLinks have only ids as the sources and targets rather than nodes
      const nodeIdMap = new Map(this.wholeGraphNodes.map(node => [node.id, node]));
      const transformedLinks: GraphLink[] = links.map(link => ({
        source: link.source,
        target: link.target,
        type: link.type || '',
        properties: link.properties || {}
      }));

      this.wholeSimulationInstance = d3.forceSimulation(this.wholeGraphNodes)
        .force('whole-link', d3.forceLink<GraphNode, GraphLink>(transformedLinks)
          .id((d: GraphNode) => d.id)
          .distance(40))
        .force('charge', d3.forceManyBody().strength(-10))
        .force('center', d3.forceCenter(this.width / 2, this.height / 2))
        .alpha(1)
        .on('tick', () => {
          console.log('Simulation tick');
          this.updateWholeSimulation();
        });

      this.wholeSimulationInstance.nodes(this.wholeGraphNodes).on('tick', () => {
        this.wholeGraphSvg.selectAll('.whole-node')
          .attr('transform', (d: GraphNode) => {
            d.x = Math.max(boundaryMargin, Math.min(1200 - boundaryMargin, d.x || 0));
            d.y = Math.max(boundaryMargin, Math.min(this.height - boundaryMargin, d.y || 0));
            return `translate(${d.x}, ${d.y})`;
          });


        this.wholeGraphSvg.selectAll('.whole-link')
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

        this.wholeGraphSvg.selectAll('.whole-link-text')
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
      },)
    } else {
      this.wholeSimulationInstance.stop();
    }
  }


  addNode(nodeType: 'Person' | 'Movie') {
    const newNode: MotifGraphNode = {
      id: (this.nodeNumber + 1).toString(),
      type: nodeType,
      x: this.width / 2,
      y: this.height / 2
    };
    this.nodeNumber += 1;
    this.motifNodes.push(newNode);

    this.updateSimulation();
    this.updateGraph();
  }

  removeNode(nodeId: string) {
    const nodeToDelete = this.motifNodes.find(node => node.id === nodeId);
    if (nodeToDelete) {
      this.motifLinks = this.motifLinks.filter(link => link.source !== nodeToDelete && link.target !== nodeToDelete);
      this.motifNodes = this.motifNodes.filter(node => node.id !== nodeId);
      this.updateGraph();
    }
  }

  private addLink(sourceId: string, targetId: string) {
    const sourceNode = this.motifNodes.find(node => node.id === sourceId);
    const targetNode = this.motifNodes.find(node => node.id === targetId);

    if (sourceNode && targetNode) {
      // Check if the link is from Person to Movie
      if (sourceNode.type === 'Person' && targetNode.type === 'Movie') {
        const linkType = prompt('Enter type for the new link (ACTED_IN, PRODUCED, DIRECTED, WROTE, REVIEWED):', 'ACTED_IN');
        if (linkType) {
          this.motifLinks.push({source: sourceNode, target: targetNode, type: linkType as MotifGraphLink['type']});

          this.updateSimulation();
          this.updateGraph();
        }
      } else {
        alert('Link can only be from Person to Movie.');
      }
    }
  }

  removeLink(link: MotifGraphLink) {
    this.motifLinks = this.motifLinks.filter(l => l !== link);
    this.updateSimulation();
    this.updateGraph();
  }

  private onNodeLeftClick(event: MouseEvent, node: MotifGraphNode | GraphNode): void {
    if (event.shiftKey) {
      this.removeNode(node.id);
    } else if (event.altKey) {  // Use Alt key to trigger the type change
      const confirmText = `Change type to ${node.type === 'Person' ? 'Movie' : 'Person'}?`;
      const changeConfirmed = confirm(confirmText);
      if (changeConfirmed) {
        const newType = node.type === 'Person' ? 'Movie' : 'Person';
        this.changeNodeType(node.id, newType);
      }
    } else {
      alert(`Clicked on node: ${node.type}`);
    }
  }

  private onNodeRightClick(event: MouseEvent, d: MotifGraphNode): void {
    event.preventDefault();
    this.selected.push(d);

    if (this.selected.length === 2) {
      const personNode = this.selected.find(node => node.type === 'Person');
      const movieNode = this.selected.find(node => node.type === 'Movie');

      if (personNode && movieNode) {
        this.addLink(personNode.id, movieNode.id);
      } else {
        alert('Link can only be from Person to Movie.');
      }

      this.selected = [];
    }
  }

  private onLinkClick(event: MouseEvent, link: MotifGraphLink): void {
    if (event.shiftKey) {
      this.removeLink(link);
    } else {
      alert(`Clicked on link between ${link.source.id} and ${link.target.id} of type ${link.type}`);
    }
  }

  changeNodeType(nodeId: string, newType: 'Person' | 'Movie') {
    const node = this.motifNodes.find(n => n.id === nodeId);
    if (node) {
      node.type = newType;
      this.updateGraph();
    }
  }

  private dragstarted(event: D3DragEvent<SVGElement, any, any>, d: any): void {
    if (!event.active) {
      //if(this.motifSvg) {
        this.simulationInstance.alphaTarget(1).restart();
      //} else {
      this.wholeSimulationInstance.alphaTarget(0.6).restart();
      //}
    }
  }

  private dragged(event: D3DragEvent<SVGElement, any, any>, d: any): void {
    d.x = event.x;
    d.y = event.y;

    if (this.motifSvg) {
      this.updateLinks(this.motifSvg, d);
    } else {
      this.updateLinks(this.wholeGraphSvg, d);
    }
  }

  private dragended(event: D3DragEvent<SVGElement, any, any>, d: any): void {
    if (!event.active) {
      this.simulationInstance.alphaTarget(0);
      this.wholeSimulationInstance.alphaTarget(0);
    }

    if (this.motifSvg) {
      this.updateLinks(this.motifSvg, d);
    } else {
      this.updateLinks(this.wholeGraphSvg, d);
    }
  }

  private zoomGraph($event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
    if (!$event.transform) return;

    this.wholeGraphSvg?.attr('transform', `${$event.transform}`);
  }


  private updateLinks(svgElement: any, d: any): void {
    svgElement.selectAll('.link')
      .attr('x1', (link: any) => {
        if (link.source === d) return d.x;
        return link.source.x;
      })
      .attr('y1', (link: any) => {
        if (link.source === d) return d.y;
        return link.source.y;
      })
      .attr('x2', (link: any) => {
        if (link.target === d) return d.x;
        return link.target.x;
      })
      .attr('y2', (link: any) => {
        if (link.target === d) return d.y;
        return link.target.y;
      });
  }

  private updateSimulation() {
    this.simulationInstance
      .nodes(this.motifNodes)
      .force('link', d3.forceLink<MotifGraphNode, MotifGraphLink>(this.motifLinks).id((d: MotifGraphNode) => d.id).distance(200))
      .alpha(1)
      .restart();
  }

  private updateWholeSimulation() {
    this.wholeSimulationInstance
      .nodes(this.wholeGraphNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(this.wholeGraphLinks).id((d: GraphNode) => d.id).distance(20))
      .alpha(1)
      .restart();
  }

  private updateGraph() {
    this.motifSvg.selectAll('*').remove();
    this.drawMotif();

    this.simulationInstance
      .nodes(this.motifNodes)
      .force('link', d3.forceLink<MotifGraphNode, MotifGraphLink>(this.motifLinks).id((d: MotifGraphNode) => d.id).distance(200))
      .alpha(1)
      .restart();
  }

  onSubmit() {
    this.service.getResults(this.motifNodes, this.motifLinks, this.lowerYear, this.upperYear)
      .subscribe(
        (response: any) => {
          console.log('Received response from backend in first page:', response);
          const additionalData = {
            motifNodes: this.motifNodes,
            motifLinks: this.motifLinks,
            startYear: this.lowerYear,
            endYear: this.upperYear
          };
          this.router.navigate(['/interface/result'], { state: {
              data: response,
              ...additionalData
            } })
            .then(success => {
              if (success) {
                console.log('Navigation was successful!');
              } else {
                console.log('Navigation has failed!');
              }
            });
        },
        (error) => {
          console.error('Error submitting data:', error);
        }
      );
  }

  private getNodeColor(type: 'Person' | 'Movie'): string {
    return type === 'Person' ? '#69b3a2' : '#ffab00';
  }

  private getLinkTextColor(type: MotifGraphLink['type']): string {
    switch (type) {
      case 'ACTED_IN':
        return '#091CC7'; // Blue
      case 'PRODUCED':
        return '#F609A9'; // Orange
      case 'DIRECTED':
        return '#069212'; // Green
      case 'WROTE':
        return '#d62728'; // Red
      case 'REVIEWED':
        return '#8809F6'; // Purple
      default:
        return '#000'; // Default black color or any other fallback color
    }
  }
}


