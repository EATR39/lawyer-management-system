# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Decorator'lar
Yardımcı decorator fonksiyonları.
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app.models import User


def role_required(roles):
    """
    Rol bazlı yetkilendirme decorator'ı
    
    Args:
        roles: İzin verilen roller listesi
    
    Usage:
        @role_required(['admin', 'lawyer'])
        def my_route():
            ...
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            
            if not user:
                return jsonify({'message': 'Kullanıcı bulunamadı'}), 404
            
            if not user.is_active:
                return jsonify({'message': 'Hesabınız devre dışı'}), 403
            
            if user.role not in roles:
                return jsonify({'message': 'Bu işlem için yetkiniz yok'}), 403
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(fn):
    """
    Admin yetkisi gerektiren decorator
    
    Usage:
        @admin_required
        def admin_only_route():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'Kullanıcı bulunamadı'}), 404
        
        if not user.is_admin():
            return jsonify({'message': 'Bu işlem için admin yetkisi gereklidir'}), 403
        
        return fn(*args, **kwargs)
    return wrapper
