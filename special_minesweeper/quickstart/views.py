from django.contrib.auth.models import User
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
import random

from special_minesweeper.enums import Trap
from special_minesweeper.quickstart.serializers import InitializeGameSerializer, UpdateCellSerializer, UserSerializer, MinesweeperGameSerializer
from special_minesweeper.quickstart.models import MinesweeperGame


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

class MinesweeperGameViewSet(viewsets.ModelViewSet):
    serializer_class = MinesweeperGameSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only list games for the current logged-in user
        return MinesweeperGame.objects.filter(user=self.request.user).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def lay_traps(self, game: MinesweeperGame, trap_count: int):
        trap_types = Trap._member_names_
        while (trap_count > 0):
            trap = trap_types[random.randint(0, len(trap_types)-1)]
            trap_laid = False
            while not trap_laid:
                row = random.randint(0, game.width - 1)
                col = random.randint(0, game.height - 1)
                if game.board_state[row][col]["value"] != "M" and game.board_state[row][col]["label"] == None:
                    trap_laid = True
                    game.board_state[row][col]["label"] = "?"
                    game.board_state[row][col]["value"] = trap
            trap_count -= 1
    @action(detail=False, methods=['post'])
    def initialize(self, request):
        """Custom endpoint to initialize a new Minesweeper game."""
        serializer = InitializeGameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        existing_game = MinesweeperGame.objects.filter(user=request.user).first()
        while existing_game:
            existing_game.delete()
            existing_game = MinesweeperGame.objects.filter(user=request.user).first()

        # Create a new game
        width = serializer.validated_data.get("width")
        height = serializer.validated_data.get("height")
        mines = serializer.validated_data.get("mines")
        trap_count = 2

        # Build board with mines
        board = [[{"label": None, "value": 0} for _ in range(width)] for _ in range(height)]
        mine_positions = random.sample(range(width * height), mines)
        for pos in mine_positions:
            r, c = divmod(pos, width)
            board[r][c]["value"] = "M"

        game = MinesweeperGame(user=request.user, width=width, height=height, mines=mines, board_state=board)
        # reveal first cell
        revealed = False
        while not revealed:
            row = random.randint(0, game.width - 1)
            col = random.randint(0, game.height - 1)
            if game.board_state[row][col]["value"] != "M":
                revealed = True
                game.move(row, col)

        self.lay_traps(game, trap_count)
        game.save()

        return Response(MinesweeperGameSerializer(game, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def update_cell(self, request):
        """endpoint to perform a move on the grid"""
        serializer = UpdateCellSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        game = MinesweeperGame.objects.filter(user=request.user).first()
        if (isinstance(game, MinesweeperGame)):
            update_value = serializer.validated_data.get("value")
            row =  serializer.validated_data.get("row")
            col =  serializer.validated_data.get("col")
            if (update_value == "reveal"):
                game.move(row, col)
            elif (update_value == "toggle_flag"):
                game.toggle_flag(row, col)
            game.save()

        return Response(MinesweeperGameSerializer(game, context={'request': request}).data)