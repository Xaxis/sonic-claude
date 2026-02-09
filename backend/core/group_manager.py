"""
Node group hierarchy management
"""
from typing import Dict, List, Optional, Literal
from dataclasses import dataclass


@dataclass
class NodeGroup:
    """SuperCollider node group"""
    id: int
    name: str
    parent_id: Optional[int] = None
    children: List[int] = None
    
    def __post_init__(self):
        if self.children is None:
            self.children = []


class GroupManager:
    """Manages SuperCollider node group hierarchy"""
    
    def __init__(self):
        """Initialize group manager"""
        self.groups: Dict[int, NodeGroup] = {}
        self.next_group_id = 1000  # Start group IDs at 1000
        
        # Create default groups
        self._create_default_groups()
    
    def _create_default_groups(self):
        """Create default group hierarchy"""
        # Root group (ID 0 is SuperCollider's default group)
        self.groups[0] = NodeGroup(id=0, name="root")
        
        # Standard mixing hierarchy
        self.groups[1] = NodeGroup(id=1, name="synths", parent_id=0)
        self.groups[2] = NodeGroup(id=2, name="effects", parent_id=0)
        self.groups[3] = NodeGroup(id=3, name="master", parent_id=0)
        
        self.groups[0].children = [1, 2, 3]
    
    def create_group(
        self, 
        name: str, 
        parent_id: int = 0,
        target: Literal["head", "tail", "before", "after"] = "tail"
    ) -> NodeGroup:
        """
        Create a new node group
        
        Args:
            name: Group name
            parent_id: Parent group ID
            target: Where to add in parent (head, tail, before, after)
            
        Returns:
            NodeGroup instance
        """
        group_id = self.next_group_id
        self.next_group_id += 1
        
        group = NodeGroup(id=group_id, name=name, parent_id=parent_id)
        self.groups[group_id] = group
        
        # Add to parent's children
        if parent_id in self.groups:
            parent = self.groups[parent_id]
            if target == "head":
                parent.children.insert(0, group_id)
            elif target == "tail":
                parent.children.append(group_id)
            # before/after would need additional logic
        
        return group
    
    def free_group(self, group_id: int):
        """Free a group and all its children"""
        if group_id not in self.groups:
            return
        
        group = self.groups[group_id]
        
        # Recursively free children
        for child_id in group.children[:]:
            self.free_group(child_id)
        
        # Remove from parent
        if group.parent_id is not None and group.parent_id in self.groups:
            parent = self.groups[group.parent_id]
            if group_id in parent.children:
                parent.children.remove(group_id)
        
        # Remove group
        del self.groups[group_id]
    
    def get_group(self, group_id: int) -> Optional[NodeGroup]:
        """Get group by ID"""
        return self.groups.get(group_id)
    
    def get_group_by_name(self, name: str) -> Optional[NodeGroup]:
        """Get group by name"""
        for group in self.groups.values():
            if group.name == name:
                return group
        return None
    
    def reset(self):
        """Reset to default groups"""
        self.groups.clear()
        self.next_group_id = 1000
        self._create_default_groups()

