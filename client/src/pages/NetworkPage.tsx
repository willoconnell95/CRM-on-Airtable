import { useEffect, useRef, useState, useCallback } from 'react';
import { useNetwork } from '@/hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { getStrengthLabel } from '@/lib/utils';
import { Network as NetworkIcon } from 'lucide-react';
import * as d3 from 'd3';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  email: string;
  title: string;
  strength: number;
  tags: string[];
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
  sharedInteractions: number;
}

export function NetworkPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [minStrength, setMinStrength] = useState('0');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const { data: networkData, isLoading } = useNetwork(
    minStrength !== '0' ? { minStrength } : undefined
  );

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !networkData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const nodes: GraphNode[] = networkData.nodes.map((n) => ({ ...n }));
    const edges: GraphEdge[] = networkData.edges.map((e) => ({ ...e }));

    if (nodes.length === 0) return;

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, any>(edges).id((d) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', (d) => Math.max(1, d.strength / 25))
      .attr('stroke-opacity', 0.6);

    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_, d) => {
        setSelectedNode(d);
      });

    node.append('circle')
      .attr('r', (d) => Math.max(8, d.strength / 5))
      .attr('fill', (d) => {
        if (d.strength >= 80) return '#10b981';
        if (d.strength >= 60) return '#22c55e';
        if (d.strength >= 40) return '#f59e0b';
        if (d.strength >= 20) return '#f97316';
        return '#ef4444';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => Math.max(8, d.strength / 5) + 14)
      .attr('font-size', '11px')
      .attr('fill', '#374151');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [networkData]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Network</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500">Min Strength:</label>
          <Select value={minStrength} onChange={(e) => setMinStrength(e.target.value)} className="w-32">
            <option value="0">All</option>
            <option value="20">20+</option>
            <option value="40">40+</option>
            <option value="60">60+</option>
            <option value="80">80+</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="relative" style={{ height: '600px' }}>
              {!networkData || (networkData.nodes.length === 0 && networkData.edges.length === 0) ? (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    icon={<NetworkIcon className="h-12 w-12" />}
                    title="No network data"
                    description="Add contacts and relationships to see the network graph."
                  />
                </div>
              ) : (
                <svg ref={svgRef} width="100%" height="100%" />
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {selectedNode.name?.charAt(0) || '?'}
                  </div>
                  <h3 className="font-semibold">{selectedNode.name}</h3>
                  {selectedNode.title && <p className="text-sm text-gray-500">{selectedNode.title}</p>}
                  {selectedNode.email && <p className="text-sm text-gray-500">{selectedNode.email}</p>}
                  <div className="pt-2">
                    <p className="text-sm font-medium">Strength: {selectedNode.strength}</p>
                    <p className="text-xs text-gray-500">{getStrengthLabel(selectedNode.strength)}</p>
                  </div>
                  {selectedNode.tags && selectedNode.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {selectedNode.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Click a node to see details</p>
              )}
            </CardContent>
          </Card>

          {networkData && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contacts</span>
                    <span className="font-medium">{networkData.nodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Connections</span>
                    <span className="font-medium">{networkData.edges.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
