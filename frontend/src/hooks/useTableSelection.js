import { useState, useEffect, useCallback } from 'react';
import customFetch from '../utils/axios.customize';

export const useTableSelection = () => {
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [tables, setTables] = useState([]);
    const [selectedTables, setSelectedTables] = useState([]);
    const [availableTables, setAvailableTables] = useState([]);
    const [tableCombinations, setTableCombinations] = useState({});
    const [loadingAreas, setLoadingAreas] = useState(false);
    const [loadingTables, setLoadingTables] = useState(false);
    const [error, setError] = useState("");

    // Calculate total capacity of selected tables
    const getTotalCapacity = () => {
        return selectedTables.reduce((total, table) => total + table.capacity, 0);
    };

    // Check if selected tables can accommodate the guest count
    const isTableSelectionValid = (guestCount) => {
        if (selectedTables.length === 0) return false;
        const totalCapacity = getTotalCapacity();
        return totalCapacity >= guestCount;
    };

    // Check if guest count exceeds all available tables capacity
    const isGuestCountExceeded = (guestCount) => {
        const MAX_CAPACITY = 23;
        return guestCount >= MAX_CAPACITY;
    };

    // Get maximum possible capacity from all available tables
    const getMaxPossibleCapacity = () => {
        return 23; // Fixed maximum capacity
    };

    // Auto-select optimal table combination
    const autoSelectTables = useCallback((tables, combinations, guestCount) => {
        console.log('Auto selecting tables for', guestCount, 'guests');
        console.log('Available tables:', tables);
        console.log('Combinations from API:', combinations);

        if (!tables || tables.length === 0) return [];

        // For small groups (1-4 people), prioritize single table
        if (guestCount <= 4) {
            const singleTable = tables.find(table => table.capacity >= guestCount);
            if (singleTable) {
                console.log('Found single table for small group:', singleTable);
                return [singleTable];
            }
        }

        // For larger groups (5+ people), check if there's a reasonably sized single table
        const reasonableSingleTable = tables.find(table =>
            table.capacity >= guestCount && table.capacity <= guestCount * 1.5
        );
        if (reasonableSingleTable) {
            console.log('Found reasonable single table for larger group:', reasonableSingleTable);
            return [reasonableSingleTable];
        }

        console.log('No single table found, trying combinations...');

        // Check API combinations
        if (combinations.single && Array.isArray(combinations.single) && combinations.single.length > 0) {
            const firstSingle = combinations.single[0];
            if (Array.isArray(firstSingle)) {
                return firstSingle;
            } else if (firstSingle && firstSingle._id) {
                return [firstSingle];
            }
        }

        if (combinations.double && Array.isArray(combinations.double) && combinations.double.length > 0) {
            const firstDouble = combinations.double[0];
            if (Array.isArray(firstDouble)) {
                return firstDouble;
            }
        }

        if (combinations.triple && Array.isArray(combinations.triple) && combinations.triple.length > 0) {
            const firstTriple = combinations.triple[0];
            if (Array.isArray(firstTriple)) {
                return firstTriple;
            }
        }

        // Fallback to local calculation
        for (let i = 0; i < tables.length; i++) {
            for (let j = i + 1; j < tables.length; j++) {
                const totalCapacity = tables[i].capacity + tables[j].capacity;
                if (totalCapacity >= guestCount) {
                    return [tables[i], tables[j]];
                }
            }
        }

        for (let i = 0; i < tables.length; i++) {
            for (let j = i + 1; j < tables.length; j++) {
                for (let k = j + 1; k < tables.length; k++) {
                    const totalCapacity = tables[i].capacity + tables[j].capacity + tables[k].capacity;
                    if (totalCapacity >= guestCount) {
                        return [tables[i], tables[j], tables[k]];
                    }
                }
            }
        }

        return [];
    }, []);

    // Get suggested table combinations
    const getSuggestedCombinations = (guestCount) => {
        const combinations = [];

        // Use API combinations if available
        if (tableCombinations.single && tableCombinations.single.length > 0) {
            combinations.push({
                type: 'single',
                tables: tableCombinations.single,
                description: 'Bàn đơn'
            });
        }

        if (tableCombinations.double && tableCombinations.double.length > 0) {
            combinations.push({
                type: 'double',
                tables: tableCombinations.double,
                description: 'Ghép 2 bàn'
            });
        }

        if (tableCombinations.triple && tableCombinations.triple.length > 0) {
            combinations.push({
                type: 'triple',
                tables: tableCombinations.triple,
                description: 'Ghép 3 bàn'
            });
        }

        // Fallback to local calculation if no API combinations
        if (combinations.length === 0) {
            const singleTables = availableTables.filter(table => table.capacity >= guestCount);
            if (singleTables.length > 0) {
                combinations.push({
                    type: 'single',
                    tables: singleTables.slice(0, 3),
                    description: 'Bàn đơn'
                });
            }

            if (guestCount >= 6) {
                const combinations2 = [];
                const combinations3 = [];

                for (let i = 0; i < availableTables.length; i++) {
                    for (let j = i + 1; j < availableTables.length; j++) {
                        const totalCapacity = availableTables[i].capacity + availableTables[j].capacity;
                        if (totalCapacity >= guestCount) {
                            combinations2.push([availableTables[i], availableTables[j]]);
                        }
                    }
                }

                for (let i = 0; i < availableTables.length; i++) {
                    for (let j = i + 1; j < availableTables.length; j++) {
                        for (let k = j + 1; k < availableTables.length; k++) {
                            const totalCapacity = availableTables[i].capacity + availableTables[j].capacity + availableTables[k].capacity;
                            if (totalCapacity >= guestCount) {
                                combinations3.push([availableTables[i], availableTables[j], availableTables[k]]);
                            }
                        }
                    }
                }

                if (combinations2.length > 0) {
                    combinations.push({
                        type: 'double',
                        tables: combinations2.slice(0, 2),
                        description: 'Ghép 2 bàn'
                    });
                }

                if (combinations3.length > 0) {
                    combinations.push({
                        type: 'triple',
                        tables: combinations3.slice(0, 1),
                        description: 'Ghép 3 bàn'
                    });
                }
            }
        }

        return combinations;
    };

    // Handle table selection (single select only)
    const handleTableSelect = (table) => {
        setSelectedTables(prev => {
            const isSelected = prev.find(t => t._id === table._id);
            if (isSelected) {
                return [];
            } else {
                return [table];
            }
        });
    };

    // Handle combination selection (replace current selection)
    const handleCombinationSelect = (tables) => {
        setSelectedTables(tables);
    };

    // Check if a table is selected
    const isTableSelected = (table) => {
        return selectedTables.find(t => t._id === table._id) !== undefined;
    };

    // Check if a combination is selected
    const isCombinationSelected = (tables) => {
        if (selectedTables.length !== tables.length) return false;
        return tables.every(table => selectedTables.find(t => t._id === table._id));
    };

    const handleAreaSelect = (area) => {
        setSelectedArea(area);
        setSelectedTables([]);
    };

    // Fetch areas on mount
    useEffect(() => {
        setLoadingAreas(true);
        customFetch
            .get("/areas")
            .then((res) => {
                setAreas(res.data.data || res.data);
                setSelectedArea(res.data.data?.[0] || res.data?.[0] || null);
            })
            .catch(() => setError("Không lấy được danh sách khu vực"))
            .finally(() => setLoadingAreas(false));
    }, []);

    // Fetch available tables when dependencies change
    const fetchAvailableTables = useCallback((areaId, date, slotId, guestCount, validationError) => {
        setLoadingTables(true);
        setError("");

        customFetch
            .get("/reservations/available-tables", {
                params: {
                    area_id: areaId,
                    date: date,
                    slot_id: slotId,
                    guest_count: guestCount,
                },
            })
            .then((res) => {
                console.log('API Response:', res.data);
                const tables = res.data.data || [];
                const combinations = res.data.combinations || {};

                setAvailableTables(tables);
                setTableCombinations(combinations);

                // Auto-select optimal tables
                const autoSelected = autoSelectTables(tables, combinations, guestCount);
                console.log('Auto selected tables:', autoSelected);
                setSelectedTables(autoSelected);
            })
            .catch((err) => {
                setError(err?.response?.data?.message || "Không lấy được danh sách bàn trống");
                setAvailableTables([]);
                setTableCombinations({});
                setSelectedTables([]);
            })
            .finally(() => setLoadingTables(false));
    }, [autoSelectTables]);

    // Internal useEffect to fetch available tables when dependencies change
    const [fetchParams, setFetchParams] = useState({
        areaId: null,
        date: null,
        slotId: null,
        guestCount: null,
        validationError: null
    });

    // Method to update fetch parameters
    const updateFetchParams = useCallback((areaId, date, slotId, guestCount, validationError) => {
        setFetchParams({ areaId, date, slotId, guestCount, validationError });
    }, []);

    // Auto-fetch when parameters change
    useEffect(() => {
        const { areaId, date, slotId, guestCount, validationError } = fetchParams;

        // Clear tables if validation error or missing required params
        if (!areaId || !date || !slotId || !guestCount || validationError) {
            setAvailableTables([]);
            setSelectedTables([]);
            setTableCombinations({});
            return;
        }

        // Fetch tables if all conditions are met
        fetchAvailableTables(areaId, date, slotId, guestCount, validationError);
    }, [fetchParams, fetchAvailableTables]);

    return {
        areas,
        selectedArea,
        tables,
        selectedTables,
        availableTables,
        tableCombinations,
        loadingAreas,
        loadingTables,
        error,
        getTotalCapacity,
        isTableSelectionValid,
        isGuestCountExceeded,
        getMaxPossibleCapacity,
        getSuggestedCombinations,
        handleTableSelect,
        handleCombinationSelect,
        isTableSelected,
        isCombinationSelected,
        handleAreaSelect,
        updateFetchParams,
        setSelectedTables,
        setError
    };
}; 