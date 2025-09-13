import type {
  BuiltRoute,
  MapBounds,
  OSMElement,
  OSMResponse,
  RoutePoint
} from '@/model/MapInterfaces.ts'
import { RoadGraph } from '@/model/RoadGraph.ts'
import { ref } from 'vue'

export const useRealRouteMap = () => {
  // Реактивные переменные с типизацией
  const mapContainer = ref<HTMLElement | null>(null);
  const map = ref<L.Map | null>(null);

  // Примерные точки для демонстрации
  const points = ref<RoutePoint[]>([
    { lat: 55.7558, lng: 37.6173, name: 'Красная площадь' },
    { lat: 55.7887, lng: 37.6517, name: 'Сокольники' },
    { lat: 55.7558, lng: 37.7173, name: 'Измайлово' },
    { lat: 55.7358, lng: 37.6273, name: 'Парк Горького' }
  ]);

  const routeColors: string[] = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FCEA2B', '#FF9FF3'];

  const routes = ref<BuiltRoute[]>([]);
  const isLoading = ref<boolean>(false);
  const roadNetwork = ref<RoadGraph>(new RoadGraph());
  const loadingProgress = ref<string>('');

  // Загрузка дорожных данных из OpenStreetMap
  const loadRoadNetwork = async (bounds: MapBounds): Promise<void> => {
    try {
      loadingProgress.value = 'Загружаем данные дорог...';

      // Определяем область для загрузки (bbox)
      const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

      // Запрос к Overpass API для получения дорог
      const overpassQuery = `
            [out:json][timeout:30];
            (
              way["highway"~"^(primary|secondary|tertiary|residential|trunk|motorway|unclassified)$"](${bbox});
            );
            out geom;
          `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OSMResponse = await response.json();
      loadingProgress.value = 'Обрабатываем дорожную сеть...';

      const graph = new RoadGraph();

      // Обработка данных
      data.elements.forEach((way: OSMElement) => {
        if (way.type === 'way' && way.geometry && way.geometry.length > 0) {
          const nodes: string[] = [];

          // Добавляем узлы
          way.geometry.forEach((node, index) => {
            const nodeId = `${way.id}_${index}`;
            graph.addNode(nodeId, node.lat, node.lon);
            nodes.push(nodeId);
          });

          // Добавляем путь с тегами
          graph.addWay(way.id, nodes, way.tags || {});
        }
      });

      roadNetwork.value = graph;
      loadingProgress.value = `Загружено ${graph.nodesSize} узлов и ${graph.waysSize} дорог`;

      console.log(`Дорожная сеть загружена: ${graph.nodesSize} узлов, ${graph.waysSize} дорог`);

    } catch (error) {
      console.error('Ошибка загрузки дорожной сети:', error);
      loadingProgress.value = `Ошибка загрузки данных: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  };

  // Построение реального маршрута между двумя точками
  const buildRealRoute = async (startPoint: RoutePoint, endPoint: RoutePoint): Promise<[number, number][] | null> => {
    if (!roadNetwork.value || roadNetwork.value.nodesSize === 0) {
      console.warn('Дорожная сеть не загружена');
      return null;
    }

    // Находим ближайшие узлы к начальной и конечной точкам
    const startNode = roadNetwork.value.findNearestNode(startPoint.lat, startPoint.lng);
    const endNode = roadNetwork.value.findNearestNode(endPoint.lat, endPoint.lng);

    if (!startNode || !endNode) {
      console.warn('Не удалось найти ближайшие узлы');
      return null;
    }

    console.log(`Поиск пути от узла ${startNode.id} к ${endNode.id}`);

    // Используем алгоритм A* для поиска пути
    const path = roadNetwork.value.findPath(startNode.id, endNode.id);

    if (path) {
      console.log(`Найден путь из ${path.length} точек`);
      return path;
    } else {
      console.warn('Путь не найден');
      return null;
    }
  };

  // Инициализация карты
  const initMap = (): void => {
    if (!window.L || !mapContainer.value) return;

    map.value = window.L.map(mapContainer.value).setView([55.7558, 37.6173], 12);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.value);

    // Добавляем маркеры
    points.value.forEach((point: RoutePoint, index: number) => {
      window.L.marker([point.lat, point.lng])
        .addTo(map.value!)
        .bindPopup(`${index + 1}. ${point.name}`);
    });

    // Автоматически загружаем дорожную сеть для текущего вида
    const bounds = map.value.getBounds();
    loadRoadNetwork({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    });
  };

  // Построение всех реальных маршрутов
  const buildRealRoutes = async (): Promise<void> => {
    if (!map.value || !roadNetwork.value || roadNetwork.value.nodesSize === 0) {
      alert('Сначала загрузите дорожную сеть!');
      return;
    }

    isLoading.value = true;
    routes.value = [];

    // Очищаем предыдущие маршруты
    map.value.eachLayer((layer: L.Layer) => {
      if (layer instanceof window.L.Polyline && !('_url' in layer)) {
        map.value!.removeLayer(layer);
      }
    });

    for (let i = 0; i < points.value.length - 1; i++) {
      const startPoint = points.value[i];
      const endPoint = points.value[i + 1];
      const color = routeColors[i % routeColors.length];

      loadingProgress.value = `Строим маршрут ${i + 1}/${points.value.length - 1}...`;

      const routeCoordinates = await buildRealRoute(startPoint, endPoint);

      if (routeCoordinates && routeCoordinates.length > 0) {
        const polyline = window.L.polyline(routeCoordinates, {
          color: color,
          weight: 4,
          opacity: 0.8
        }).addTo(map.value);

        polyline.bindPopup(`Реальный маршрут ${i + 1}: ${startPoint.name} → ${endPoint.name}<br>Точек: ${routeCoordinates.length}`);

        routes.value.push({
          from: startPoint.name,
          to: endPoint.name,
          color: color,
          polyline: polyline,
          points: routeCoordinates.length
        });
      } else {
        console.warn(`Не удалось построить маршрут от ${startPoint.name} к ${endPoint.name}`);
      }
    }

    isLoading.value = false;
    loadingProgress.value = `Построено ${routes.value.length} маршрутов`;
  };

  // Перезагрузка дорожной сети
  const reloadRoadNetwork = (): void => {
    if (!map.value) return;

    const bounds = map.value.getBounds();
    loadRoadNetwork({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    });
  };

  // Добавление точки
  const addPoint = (): void => {
    const center = map.value ? map.value.getCenter() : { lat: 55.7558, lng: 37.6173 };
    const newPoint: RoutePoint = {
      lat: center.lat + (Math.random() - 0.5) * 0.02,
      lng: center.lng + (Math.random() - 0.5) * 0.02,
      name: `Точка ${points.value.length + 1}`
    };
    points.value.push(newPoint);

    if (map.value) {
      window.L.marker([newPoint.lat, newPoint.lng])
        .addTo(map.value)
        .bindPopup(`${points.value.length}. ${newPoint.name}`);
    }
  };

  // Удаление последней точки
  const removeLastPoint = (): void => {
    if (points.value.length > 2) {
      points.value.pop();
      if (map.value) {
        map.value.eachLayer((layer: L.Layer) => {
          if (layer instanceof window.L.Marker) {
            map.value!.removeLayer(layer);
          }
        });

        points.value.forEach((point: RoutePoint, index: number) => {
          window.L.marker([point.lat, point.lng])
            .addTo(map.value!)
            .bindPopup(`${index + 1}. ${point.name}`);
        });
      }
    }
  };

  return {
    mapContainer,
    points,
    routes,
    isLoading,
    roadNetwork,
    loadingProgress,
    buildRealRoutes,
    reloadRoadNetwork,
    addPoint,
    removeLastPoint,
    initMap
  };
};
