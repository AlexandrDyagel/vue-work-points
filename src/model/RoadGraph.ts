// Структура для хранения дорожной сети с типизацией
import type { RoadNode, RoadWay } from '@/model/MapInterfaces.ts'

export class RoadGraph {
  private nodes: Map<string, RoadNode> = new Map();
  private ways: Map<number, RoadWay> = new Map();

  addNode(id: string, lat: number, lng: number): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, {
        id,
        lat: parseFloat(lat.toString()),
        lng: parseFloat(lng.toString()),
        connections: new Set<string>()
      });
    }
  }

  addWay(wayId: number, nodes: string[], tags: Record<string, string> = {}): void {
    this.ways.set(wayId, { nodes, tags });

    // Создаем соединения между соседними узлами
    for (let i = 0; i < nodes.length - 1; i++) {
      const nodeA = nodes[i];
      const nodeB = nodes[i + 1];

      if (this.nodes.has(nodeA) && this.nodes.has(nodeB)) {
        this.nodes.get(nodeA)!.connections.add(nodeB);

        // Если не односторонняя дорога
        if (!tags.oneway || tags.oneway !== 'yes') {
          this.nodes.get(nodeB)!.connections.add(nodeA);
        }
      }
    }
  }

  // Поиск ближайшего узла к заданным координатам
  findNearestNode(lat: number, lng: number): RoadNode | null {
    let minDistance = Infinity;
    let nearestNode: RoadNode | null = null;

    for (const node of this.nodes.values()) {
      const distance = this.calculateDistance(lat, lng, node.lat, node.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }

    return nearestNode;
  }

  // Расчет расстояния между двумя точками (формула гаверсинуса)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Радиус Земли в км
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Алгоритм A* для поиска кратчайшего пути
  findPath(startNodeId: string, endNodeId: string): [number, number][] | null {
    const openSet = new Set<string>([startNodeId]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    // Инициализация
    for (const nodeId of this.nodes.keys()) {
      gScore.set(nodeId, Infinity);
      fScore.set(nodeId, Infinity);
    }

    gScore.set(startNodeId, 0);
    const startNode = this.nodes.get(startNodeId);
    const endNode = this.nodes.get(endNodeId);

    if (!startNode || !endNode) {
      return null;
    }

    fScore.set(startNodeId, this.calculateDistance(
      startNode.lat, startNode.lng,
      endNode.lat, endNode.lng
    ));

    while (openSet.size > 0) {
      // Найти узел с наименьшим fScore
      let current: string | null = null;
      let minFScore = Infinity;

      for (const nodeId of openSet) {
        const score = fScore.get(nodeId) ?? Infinity;
        if (score < minFScore) {
          minFScore = score;
          current = nodeId;
        }
      }

      if (!current) break;

      if (current === endNodeId) {
        // Путь найден, восстанавливаем маршрут
        const path: [number, number][] = [];
        let currentNode: string | undefined = current;

        while (currentNode !== undefined) {
          const node = this.nodes.get(currentNode);
          if (node) {
            path.unshift([node.lat, node.lng]);
          }
          currentNode = cameFrom.get(currentNode);
        }

        return path;
      }

      openSet.delete(current);
      const currentNode = this.nodes.get(current);
      if (!currentNode) continue;

      for (const neighborId of currentNode.connections) {
        const neighbor = this.nodes.get(neighborId);
        if (!neighbor) continue;

        const tentativeGScore = (gScore.get(current) ?? Infinity) +
          this.calculateDistance(
            currentNode.lat, currentNode.lng,
            neighbor.lat, neighbor.lng
          );

        if (tentativeGScore < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, current);
          gScore.set(neighborId, tentativeGScore);
          fScore.set(neighborId, tentativeGScore +
            this.calculateDistance(
              neighbor.lat, neighbor.lng,
              endNode.lat, endNode.lng
            ));

          if (!openSet.has(neighborId)) {
            openSet.add(neighborId);
          }
        }
      }
    }

    return null; // Путь не найден
  }

  get nodesSize(): number {
    return this.nodes.size;
  }

  get waysSize(): number {
    return this.ways.size;
  }
}
