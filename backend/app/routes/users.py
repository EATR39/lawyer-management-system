# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Kullanıcı Yönetimi Routes
Kullanıcı CRUD endpoint'leri (Admin only).
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.utils.decorators import role_required

users_bp = Blueprint('users', __name__)


@users_bp.route('', methods=['GET'])
@jwt_required()
@role_required(['admin'])
def get_users():
    """
    Kullanıcı listesi (Admin only)
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config['ITEMS_PER_PAGE'], type=int)
    search = request.args.get('search', '')
    role = request.args.get('role', '')
    is_active = request.args.get('is_active', '')
    
    query = User.query
    
    if search:
        search_filter = f'%{search}%'
        query = query.filter(
            db.or_(
                User.name.ilike(search_filter),
                User.surname.ilike(search_filter),
                User.email.ilike(search_filter)
            )
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if is_active != '':
        query = query.filter(User.is_active == (is_active.lower() == 'true'))
    
    query = query.order_by(User.name.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'users': [u.to_dict() for u in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@users_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_user(id):
    """
    Tek kullanıcı detayı
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Admin değilse sadece kendi bilgilerini görebilir
    if not current_user.is_admin() and current_user_id != id:
        return jsonify({'message': 'Yetkisiz erişim'}), 403
    
    user = User.query.get_or_404(id)
    return jsonify({
        'user': user.to_dict()
    }), 200


@users_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def create_user():
    """
    Yeni kullanıcı oluştur (Admin only)
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    if not data.get('email'):
        return jsonify({'message': 'E-posta gereklidir'}), 400
    if not data.get('password'):
        return jsonify({'message': 'Şifre gereklidir'}), 400
    if not data.get('name'):
        return jsonify({'message': 'Ad gereklidir'}), 400
    if not data.get('surname'):
        return jsonify({'message': 'Soyad gereklidir'}), 400
    
    email = data['email'].strip().lower()
    
    # E-posta kontrolü
    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({'message': 'Bu e-posta adresi zaten kayıtlı'}), 400
    
    # Şifre uzunluk kontrolü
    if len(data['password']) < 6:
        return jsonify({'message': 'Şifre en az 6 karakter olmalıdır'}), 400
    
    user = User(
        email=email,
        name=data['name'].strip(),
        surname=data['surname'].strip(),
        role=data.get('role', 'lawyer'),
        phone=data.get('phone', '').strip() or None,
        is_active=data.get('is_active', True)
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'Kullanıcı başarıyla oluşturuldu',
        'user': user.to_dict()
    }), 201


@users_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_user(id):
    """
    Kullanıcı güncelle
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    user = User.query.get_or_404(id)
    
    # Admin değilse sadece kendi bilgilerini güncelleyebilir
    if not current_user.is_admin() and current_user_id != id:
        return jsonify({'message': 'Yetkisiz erişim'}), 403
    
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    # E-posta değişikliği (sadece admin)
    if 'email' in data and current_user.is_admin():
        email = data['email'].strip().lower()
        if email != user.email:
            existing = User.query.filter_by(email=email).first()
            if existing:
                return jsonify({'message': 'Bu e-posta adresi zaten kayıtlı'}), 400
            user.email = email
    
    if 'name' in data:
        user.name = data['name'].strip()
    if 'surname' in data:
        user.surname = data['surname'].strip()
    if 'phone' in data:
        user.phone = data['phone'].strip() or None
    
    # Rol değişikliği (sadece admin)
    if 'role' in data and current_user.is_admin():
        user.role = data['role']
    
    # Aktiflik değişikliği (sadece admin)
    if 'is_active' in data and current_user.is_admin():
        user.is_active = data['is_active']
    
    # Şifre değişikliği
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            return jsonify({'message': 'Şifre en az 6 karakter olmalıdır'}), 400
        user.set_password(data['password'])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Kullanıcı başarıyla güncellendi',
        'user': user.to_dict()
    }), 200


@users_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def delete_user(id):
    """
    Kullanıcı sil (Admin only)
    """
    current_user_id = get_jwt_identity()
    
    # Kendi hesabını silemez
    if current_user_id == id:
        return jsonify({'message': 'Kendi hesabınızı silemezsiniz'}), 400
    
    user = User.query.get_or_404(id)
    
    # İlişkili kayıtları kontrol et
    if user.clients_created.count() > 0 or user.cases_assigned.count() > 0:
        # Silmek yerine deaktif et
        user.is_active = False
        db.session.commit()
        return jsonify({'message': 'Kullanıcının ilişkili kayıtları var. Hesap deaktif edildi.'}), 200
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'Kullanıcı başarıyla silindi'}), 200


@users_bp.route('/roles', methods=['GET'])
@jwt_required()
def get_roles():
    """
    Kullanıcı rollerini listele
    """
    return jsonify({
        'roles': User.ROLES
    }), 200


@users_bp.route('/lawyers', methods=['GET'])
@jwt_required()
def get_lawyers():
    """
    Avukat listesi (dava atamak için)
    """
    lawyers = User.query.filter(
        User.role.in_(['admin', 'lawyer']),
        User.is_active == True
    ).order_by(User.name.asc()).all()
    
    return jsonify({
        'lawyers': [{'id': l.id, 'full_name': l.full_name, 'email': l.email} for l in lawyers]
    }), 200
